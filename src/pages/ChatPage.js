import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import './ChatPage.css';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:17777';

const normalizeInt = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const getAxiosErrorInfo = (err) => {
  const status = err?.response?.status;
  const serverMessage = err?.response?.data?.error || err?.response?.data?.message;
  const message = serverMessage || err?.message || 'Erreur inconnue';
  return { status, message };
};

export default function ChatPage() {
  const navigate = useNavigate();
  const { reservationId: reservationIdRaw, etapeNumero: etapeNumeroRaw } = useParams();

  const reservationId = useMemo(() => normalizeInt(reservationIdRaw, null), [reservationIdRaw]);
  const etapeNumero = useMemo(() => normalizeInt(etapeNumeroRaw, 1), [etapeNumeroRaw]);

  const token = useMemo(() => localStorage.getItem('token'), []);

  const [loading, setLoading] = useState(true);
  const [fatalError, setFatalError] = useState(null);
  const [info, setInfo] = useState(null);

  const [conversationId, setConversationId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);

  const scrollRef = useRef(null);
  const pollRef = useRef(null);
  const conversationIdRef = useRef(null);
  const lastMessageIdRef = useRef(0);
  const knownMessageIdsRef = useRef(new Set());
  const pollInFlightRef = useRef(false);
  const isMountedRef = useRef(true);

  const headers = useMemo(() => ({ Authorization: `Bearer ${token}` }), [token]);

  const scrollToBottom = () => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  };

  const stopPolling = () => {
    if (pollRef.current) {
      clearTimeout(pollRef.current);
      pollRef.current = null;
    }
    pollInFlightRef.current = false;
  };

  const schedulePoll = () => {
    stopPolling();
    pollRef.current = setTimeout(async () => {
      await fetchNewMessages();
      // Tant qu'on est monté et qu'on a une conversation, on re-planifie.
      if (isMountedRef.current && conversationIdRef.current) {
        schedulePoll();
      }
    }, 3000);
  };

  const startPolling = (convId) => {
    conversationIdRef.current = convId;
    schedulePoll();
  };

  const fetchNewMessages = async () => {
    const convId = conversationIdRef.current;
    if (!convId) return;
    if (pollInFlightRef.current) return;
    pollInFlightRef.current = true;

    try {
      const res = await axios.get(
        `${API_BASE_URL}/chat/conversations/${convId}/messages`,
        {
          headers,
          params: { after_message_id: lastMessageIdRef.current || 0, limit: 200 },
          timeout: 5000,
        }
      );

      const incomingAll = Array.isArray(res.data?.messages) ? res.data.messages : [];
      if (incomingAll.length === 0) return;

      const incoming = incomingAll.filter((m) => {
        const id = m?.message_id;
        if (!id) return false;
        if (knownMessageIdsRef.current.has(id)) return false;
        knownMessageIdsRef.current.add(id);
        return true;
      });

      if (incoming.length > 0) {
        setMessages((prev) => [...prev, ...incoming]);
      }

      const newLast = incomingAll.reduce(
        (acc, m) => (m?.message_id > acc ? m.message_id : acc),
        lastMessageIdRef.current || 0
      );
      if (newLast && newLast !== lastMessageIdRef.current) {
        lastMessageIdRef.current = newLast;
      }

      // best-effort
      setTimeout(scrollToBottom, 0);
    } catch (err) {
      const { status } = getAxiosErrorInfo(err);
      // Soft-fail: chat désactivé ou accès interdit => on stoppe le polling et on informe.
      if (status === 404) {
        stopPolling();
        setFatalError('Chat indisponible (désactivé côté serveur).');
      } else if (status === 403) {
        stopPolling();
        setFatalError('Accès au chat refusé (disponible uniquement après validation).');
      }
      // Sinon: on laisse le polling continuer (réseau instable)
    } finally {
      pollInFlightRef.current = false;
    }
  };

  const initConversation = async () => {
    if (!token) {
      setFatalError('Vous devez être connecté pour accéder au chat.');
      setLoading(false);
      return;
    }

    if (!reservationId) {
      setFatalError('reservationId invalide.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setFatalError(null);
    setInfo(null);
    stopPolling();
    conversationIdRef.current = null;
    lastMessageIdRef.current = 0;
    knownMessageIdsRef.current = new Set();
    pollInFlightRef.current = false;
    setConversationId(null);
    setMessages([]);

    try {
      const convRes = await axios.post(
        `${API_BASE_URL}/chat/conversations`,
        { reservation_id: reservationId, etape_numero: etapeNumero },
        { headers, timeout: 7000 }
      );

      const convId = convRes.data?.conversation_id;
      if (!convId) {
        setFatalError('Conversation introuvable.');
        return;
      }

      setConversationId(convId);
      conversationIdRef.current = convId;

      // Charger les messages init
      const msgRes = await axios.get(
        `${API_BASE_URL}/chat/conversations/${convId}/messages`,
        { headers, params: { after_message_id: 0, limit: 200 }, timeout: 7000 }
      );

      const initial = Array.isArray(msgRes.data?.messages) ? msgRes.data.messages : [];
      setMessages(initial);
      knownMessageIdsRef.current = new Set(initial.map((m) => m?.message_id).filter(Boolean));
      const initialLast = initial.reduce((acc, m) => (m?.message_id > acc ? m.message_id : acc), 0);
      lastMessageIdRef.current = initialLast;

      startPolling(convId);
      setTimeout(scrollToBottom, 0);
    } catch (err) {
      const { status, message } = getAxiosErrorInfo(err);
      if (status === 404) {
        setFatalError('Chat indisponible (désactivé côté serveur).');
      } else if (status === 403) {
        setFatalError('Chat indisponible avant validation de la prise en charge.');
      } else {
        setFatalError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    isMountedRef.current = true;
    initConversation();
    return () => {
      isMountedRef.current = false;
      stopPolling();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reservationIdRaw, etapeNumeroRaw]);

  const onSend = async (e) => {
    e.preventDefault();
    if (!conversationId) return;

    const content = String(draft || '').trim();
    if (!content) return;

    setSending(true);
    setInfo(null);

    try {
      const res = await axios.post(
        `${API_BASE_URL}/chat/conversations/${conversationId}/messages`,
        { content },
        { headers, timeout: 7000 }
      );

      const msg = res.data;
      if (msg?.message_id) {
        if (!knownMessageIdsRef.current.has(msg.message_id)) {
          knownMessageIdsRef.current.add(msg.message_id);
          setMessages((prev) => [...prev, msg]);
        }
        lastMessageIdRef.current = Math.max(lastMessageIdRef.current || 0, msg.message_id);
        setDraft('');
        setTimeout(scrollToBottom, 0);
      }
    } catch (err) {
      const { status, message } = getAxiosErrorInfo(err);
      if (status === 404) {
        stopPolling();
        setFatalError('Chat indisponible (désactivé côté serveur).');
      } else if (status === 403) {
        stopPolling();
        setFatalError('Accès au chat refusé.');
      } else {
        setInfo(message);
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="chatpage">
      <div className="chatpage__header">
        <button className="chatpage__back" type="button" onClick={() => navigate(-1)}>
          ← Retour
        </button>
        <div>
          <h1 className="chatpage__title">💬 Chat</h1>
          <div className="chatpage__subtitle">
            Réservation #{reservationId ?? '—'} • Étape {etapeNumero}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="chatpage__state">Chargement…</div>
      ) : fatalError ? (
        <div className="chatpage__state chatpage__state--error">
          <div className="chatpage__stateTitle">Chat indisponible</div>
          <div className="chatpage__stateText">{fatalError}</div>
          <button className="chatpage__retry" type="button" onClick={() => initConversation()}>
            Réessayer
          </button>
        </div>
      ) : (
        <>
          <div className="chatpage__messages" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="chatpage__empty">Aucun message pour le moment.</div>
            ) : (
              messages.map((m) => (
                <div key={m.message_id} className="chatpage__msg">
                  <div className="chatpage__msgMeta">
                    <span className="chatpage__msgSender">#{m.sender_user_id}</span>
                    <span className="chatpage__msgTime">
                      {m.createdAt ? new Date(m.createdAt).toLocaleString('fr-FR') : ''}
                    </span>
                  </div>
                  <div className="chatpage__msgBody">{m.content}</div>
                </div>
              ))
            )}
          </div>

          <form className="chatpage__composer" onSubmit={onSend}>
            <input
              className="chatpage__input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Écrire un message…"
              disabled={sending}
              maxLength={2000}
            />
            <button className="chatpage__send" type="submit" disabled={sending || !draft.trim()}>
              Envoyer
            </button>
          </form>

          {info ? <div className="chatpage__info">{info}</div> : null}
        </>
      )}
    </div>
  );
}

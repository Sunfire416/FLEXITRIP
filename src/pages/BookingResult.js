import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import './BookingResult.css';

const BookingResult = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const { booking } = location.state || {};

    if (!booking) {
        return (
            <div className="booking-result-container">
                <div className="error-card">
                    <h2>❌ Aucune réservation trouvée</h2>
                    <p>Retournez à la recherche pour créer une réservation</p>
                    <button onClick={() => navigate('/user/search')}>
                        Retour à la recherche
                    </button>
                </div>
            </div>
        );
    }

    const { workflow_type, booking: bookingData, payment, timeline, total_price, remaining_balance, itinerary } = booking;

    const formatTime = (isoDate) => {
        if (!isoDate) return 'N/A';
        return new Date(isoDate).toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Europe/Paris'
        });
    };

    const formatDateTime = (isoDate) => {
        if (!isoDate) return 'N/A';
        return new Date(isoDate).toLocaleString('fr-FR', {
            day: '2-digit',
            month: 'short',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'Europe/Paris'
        });
    };

    const getTransportIcon = (mode) => {
        const icons = {
            train: '🚆',
            bus: '🚌',
            flight: '✈️',
            avion: '✈️',
            metro: '🚇',
            tram: '🚊',
            walk: '🚶',
            taxi: '🚕'
        };
        return icons[mode] || '🚗';
    };

    const getWorkflowIcon = (type) => {
        const icons = {
            'MINIMAL': '🚌',
            'LIGHT': '🚆',
            'MODERATE': '✈️',
            'FULL': '🌍'
        };
        return icons[type] || '🎫';
    };

    const getWorkflowColor = (type) => {
        const colors = {
            'MINIMAL': '#22c55e',
            'LIGHT': '#3b82f6',
            'MODERATE': '#f59e0b',
            'FULL': '#ef4444'
        };
        return colors[type] || '#667eea';
    };

    return (
        <div className="booking-result-container">
            {/* Success Header */}
            <div className="success-header">
                <div className="success-icon">✅</div>
                <h1>Réservation Confirmée !</h1>
                <p>Votre voyage a été réservé avec succès</p>
            </div>

            {/* Workflow Badge */}
            <div 
                className="workflow-badge"
                style={{ backgroundColor: getWorkflowColor(workflow_type) }}
            >
                <span className="workflow-icon">{getWorkflowIcon(workflow_type)}</span>
                <span className="workflow-type">Workflow {workflow_type}</span>
            </div>

            {/* Main Info Card */}
            <div className="booking-card">
                <div className="booking-header">
                    <h2>📋 Détails de votre réservation</h2>
                    <span className="reservation-id">
                        Réservation #{bookingData.reservation_id || bookingData.voyage_id}
                    </span>
                </div>

                <div className="booking-details">
                    <div className="detail-row">
                        <span className="detail-label">📍 Référence</span>
                        <span className="detail-value">{bookingData.booking_reference}</span>
                    </div>

                    <div className="detail-row">
                        <span className="detail-label">🏢 Opérateur</span>
                        <span className="detail-value">{bookingData.operator}</span>
                    </div>

                    <div className="detail-row">
                        <span className="detail-label">💰 Prix</span>
                        <span className="detail-value">{total_price?.toFixed(2)}€</span>
                    </div>

                    <div className="detail-row">
                        <span className="detail-label">💳 Solde restant</span>
                        <span className="detail-value">{remaining_balance?.toFixed(2)}€</span>
                    </div>
                </div>

                {/* Assistance PMR */}
                {bookingData.assistance && (
                    <div className="assistance-info">
                        <h3>🦽 Assistance PMR</h3>
                        <div className="assistance-details">
                            <p><strong>Agent:</strong> {bookingData.assistance.agent_name}</p>
                            <p><strong>Point de rencontre:</strong> {bookingData.assistance.meeting_point}</p>
                            {bookingData.assistance.meeting_time && (
                                <p><strong>Heure:</strong> {new Date(bookingData.assistance.meeting_time).toLocaleString('fr-FR')}</p>
                            )}
                        </div>
                    </div>
                )}

                {/* 🆕 Prise en Charge PMR - Multi-segments */}
                {bookingData.prise_en_charge && Array.isArray(bookingData.prise_en_charge) && bookingData.prise_en_charge.length > 0 ? (
                    <div className="prise-en-charge-card">
                        <h3>📋 Prise en Charge PMR {bookingData.prise_en_charge.length > 1 && `(${bookingData.prise_en_charge.length} segments)`}</h3>
                        {bookingData.prise_en_charge.map((pec, index) => (
                            <div key={pec.id} className="pec-item">
                                <div className="pec-header">
                                    <h4>🚌 Étape {pec.etape_numero} - {pec.mode ? pec.mode.toUpperCase() : 'Transport'}</h4>
                                    <span className={`pec-status ${pec.status}`}>
                                        {pec.status === 'pending' && '⏳ En attente'}
                                        {pec.status === 'validated' && '✅ Validée'}
                                        {pec.status === 'cancelled' && '❌ Annulée'}
                                    </span>
                                </div>
                                <p className="pec-info">
                                    <strong>Lieu:</strong> {pec.location}
                                    {pec.line && <> • <strong>Ligne:</strong> {pec.line}</>}
                                    {pec.operator && <> • <strong>Opérateur:</strong> {pec.operator}</>}
                                </p>
                                {pec.status === 'pending' && (
                                    <div className="pec-link-container">
                                        <label>🔗 Lien de validation à partager au personnel :</label>
                                        <div className="pec-url-box">
                                            <input 
                                                type="text" 
                                                readOnly 
                                                value={pec.validation_url} 
                                                className="pec-url-input"
                                                onClick={(e) => e.target.select()}
                                            />
                                            <button 
                                                className="pec-copy-btn"
                                                onClick={() => {
                                                    navigator.clipboard.writeText(pec.validation_url);
                                                    alert(`✅ Lien copié pour l'étape ${pec.etape_numero} !`);
                                                }}
                                            >
                                                📋 Copier
                                            </button>
                                        </div>
                                    </div>
                                )}
                                {pec.status === 'validated' && (
                                    <div className="pec-validated-info">
                                        <p><strong>✅ Validée</strong></p>
                                        {pec.validated_at && (
                                            <p>Le {new Date(pec.validated_at).toLocaleString('fr-FR')}</p>
                                        )}
                                        {pec.validated_by && (
                                            <p>Par : {pec.validated_by}</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                        
                        <div className="suivi-button-container">
                            <button 
                                className="btn-suivi" 
                                onClick={() => navigate(`/suivi-prise-en-charge/${bookingData.reservation_id}`)}
                            >
                                📊 Suivre toutes les prises en charge
                            </button>
                        </div>
                        
                        <p className="pec-note">
                            💡 Le personnel de chaque transport pourra valider votre prise en charge via son lien
                        </p>
                    </div>
                ) : (
                    <div className="prise-en-charge-card" style={{background: '#f3f4f6', borderLeftColor: '#9ca3af'}}>
                        <h3>📋 Prise en Charge PMR</h3>
                        <p style={{margin: 0, color: '#6b7280', fontSize: '14px'}}>
                            ℹ️ Cette fonctionnalité n'était pas disponible lors de la création de cette réservation. 
                            Elle sera activée pour vos prochaines réservations.
                        </p>
                    </div>
                )}

                {/* Biometric Data */}
                {bookingData.biometric && (
                    <div className="biometric-info">
                        <h3>🔐 Vérification biométrique</h3>
                        <div className="biometric-details">
                            <p>✅ Enrôlement réussi</p>
                            <p>Confiance: {(bookingData.biometric.confidence * 100).toFixed(1)}%</p>
                            {bookingData.biometric.liveness && (
                                <p>Liveness: {bookingData.biometric.liveness}</p>
                            )}
                        </div>
                    </div>
                )}

                {/* Check-in Info (for flights) */}
                {bookingData.checkin && (
                    <div className="checkin-info">
                        <h3>✈️ Check-in</h3>
                        <div className="checkin-details">
                            <div className="checkin-row">
                                <span>Boarding Pass:</span>
                                <strong>{bookingData.checkin.boarding_pass}</strong>
                            </div>
                            <div className="checkin-row">
                                <span>Porte:</span>
                                <strong>{bookingData.checkin.gate}</strong>
                            </div>
                            <div className="checkin-row">
                                <span>Siège:</span>
                                <strong>{bookingData.checkin.seat}</strong>
                            </div>
                            {bookingData.checkin.boarding_time && (
                                <div className="checkin-row">
                                    <span>Embarquement:</span>
                                    <strong>{new Date(bookingData.checkin.boarding_time).toLocaleTimeString('fr-FR')}</strong>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* OCR Data (for international flights) */}
                {bookingData.ocr_data && (
                    <div className="ocr-info">
                        <h3>📄 Document vérifié</h3>
                        <div className="ocr-details">
                            <p>Type: {bookingData.ocr_data.document_type}</p>
                            <p>Numéro: {bookingData.ocr_data.document_number}</p>
                            <p>Confiance: {(bookingData.ocr_data.confidence * 100).toFixed(1)}%</p>
                        </div>
                    </div>
                )}
            </div>

            {/* QR Code Card */}
            {bookingData.qr_code && (
                <div className="qr-card">
                    <h2>📱 Votre QR Code</h2>
                    <p className="qr-instruction">Présentez ce code lors de votre voyage</p>
                    
                    <div className="qr-display">
                        <QRCodeSVG 
                            value={bookingData.qr_code.qr_url || bookingData.qr_code.qr_data}
                            size={200}
                            level="H"
                            includeMargin={true}
                        />
                    </div>

                    <div className="validation-code">
                        <span className="code-label">Code de validation</span>
                        <span className="code-value">{bookingData.qr_code.display_code}</span>
                    </div>

                    <p className="qr-help">
                        💡 Vous pouvez également donner le code de validation au personnel
                    </p>
                </div>
            )}

            {/* 🆕 Itinéraire Détaillé */}
            {itinerary && itinerary.segments && itinerary.segments.length > 0 && (
                <div className="itinerary-card">
                    <h2>🗺️ Votre Itinéraire Détaillé</h2>
                    <div className="itinerary-timeline">
                        {itinerary.segments.map((segment, idx) => (
                            <div key={idx} className="itinerary-segment">
                                <div className="segment-timeline-marker">
                                    <div className="segment-icon">{getTransportIcon(segment.mode)}</div>
                                    {idx < itinerary.segments.length - 1 && <div className="timeline-connector"></div>}
                                </div>
                                
                                <div className="segment-content">
                                    <div className="segment-header">
                                        <div className="segment-transport">
                                            <strong>{(segment.mode || '').toUpperCase()}</strong>
                                            {segment.line && (
                                                <span className="segment-line-badge">Ligne {segment.line}</span>
                                            )}
                                            {segment.operator && (
                                                <span className="segment-operator">{segment.operator}</span>
                                            )}
                                        </div>
                                        <div className="segment-duration">
                                            {segment.duration ? `${segment.duration}min` : ''}
                                        </div>
                                    </div>

                                    <div className="segment-route">
                                        <div className="route-point departure">
                                            <span className="point-icon">🔵</span>
                                            <div className="point-info">
                                                <strong>{segment.departure_station || segment.from}</strong>
                                                {segment.departure_time && (
                                                    <span className="point-time">{formatTime(segment.departure_time)}</span>
                                                )}
                                            </div>
                                        </div>

                                        <div className="route-point arrival">
                                            <span className="point-icon">🟢</span>
                                            <div className="point-info">
                                                <strong>{segment.arrival_station || segment.to}</strong>
                                                {segment.arrival_time && (
                                                    <span className="point-time">{formatTime(segment.arrival_time)}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>

                                    {segment.accessible === false && (
                                        <div className="accessibility-warning">
                                            ⚠️ Accessibilité limitée
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="itinerary-summary">
                        <span>🕐 Durée totale: {itinerary.duration || itinerary.total_duration || 'N/A'} min</span>
                        {itinerary.distance && (
                            <span>📍 Distance: {(itinerary.distance / 1000).toFixed(1)} km</span>
                        )}
                    </div>
                </div>
            )}

            {/* Timeline Card */}
            {timeline && timeline.length > 0 && (
                <div className="timeline-card">
                    <h2>⏱️ Étapes effectuées</h2>
                    <div className="timeline-steps">
                        {timeline.map((step, idx) => (
                            <div key={idx} className="timeline-step completed">
                                <div className="step-number">{step.order}</div>
                                <div className="step-info">
                                    <strong>{step.step.replace(/_/g, ' ')}</strong>
                                    <span className="step-duration">{step.duration}</span>
                                </div>
                                <div className="step-check">✓</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Payment Info */}
            {payment && (
                <div className="payment-card">
                    <h2>💳 Paiement</h2>
                    <div className="payment-details">
                        <p><strong>Transaction ID:</strong></p>
                        <p className="transaction-id">{payment.transaction_id}</p>
                        <div className="payment-row">
                            <span>Bloc:</span>
                            <span>#{payment.block_number}</span>
                        </div>
                        <div className="payment-row">
                            <span>Montant:</span>
                            <span><strong>{payment.amount?.toFixed(2)}€</strong></span>
                        </div>
                        <div className="payment-row">
                            <span>Frais:</span>
                            <span>{payment.gas_fee?.toFixed(3)}€</span>
                        </div>
                        <div className="payment-row">
                            <span>Statut:</span>
                            <span className="status-confirmed">✅ {payment.status}</span>
                        </div>
                        <div className="payment-row">
                            <span>Confirmations:</span>
                            <span>{payment.confirmations}</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Next Steps */}
            <div className="next-steps-card">
                <h2>🚀 Prochaines étapes</h2>
                <p className="next-step-main">{bookingData.next_step || bookingData.steps_completed?.[bookingData.steps_completed.length - 1]}</p>
                
                <div className="steps-list">
                    {bookingData.steps_completed && bookingData.steps_completed.map((step, idx) => (
                        <div key={idx} className="completed-step">
                            ✅ {step.replace(/_/g, ' ')}
                        </div>
                    ))}
                </div>
            </div>

            {/* Action Buttons */}
            <div className="action-buttons">
                <button 
                    className="btn-primary"
                    onClick={() => navigate('/user/voyages')}
                >
                    📖 Voir mes voyages
                </button>
                <button 
                    className="btn-secondary"
                    onClick={() => navigate('/user/search')}
                >
                    🔍 Nouvelle recherche
                </button>
                <button 
                    className="btn-secondary"
                    onClick={() => window.print()}
                >
                    🖨️ Imprimer
                </button>
            </div>
        </div>
    );
};

export default BookingResult;

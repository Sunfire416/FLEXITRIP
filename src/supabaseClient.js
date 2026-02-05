import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://vfhekrjijevefwyztroc.supabase.co/';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZmaGVrcmppamV2ZWZ3eXp0cm9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk5NTI3OTksImV4cCI6MjA4NTUyODc5OX0.97fMPXZBeGvFkUfgRChmA1RrG5HCX1DGU3KC_iwHyiI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://gdlkwpmhxjaxialgvdyc.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdkbGt3cG1oeGpheGlhbGd2ZHljIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3Nzk2MTksImV4cCI6MjA4MjM1NTYxOX0.xHN_y2lwrD-6yIOeOc42CZ_HmklGS6chCACsSXkT9PU';
const USER_TOKEN = 'eyJhbGciOiJFUzI1NiIsImtpZCI6ImRlNjk2ZGRiLTY3NDEtNDZmNi05ZDYxLWRmZGE1MjM3ZjI0OCIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2dkbGt3cG1oeGpheGlhbGd2ZHljLnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJmMDI2MzBiZC1mYjhhLTRmNWQtOWNiNi0wYzE5MzNiZjZlNTgiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzY2ODU0MjQ5LCJpYXQiOjE3NjY4NTA2NDksImVtYWlsIjoibHVrYUBmbG91ZW5jZS5jb20iLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6Imdvb2dsZSIsInByb3ZpZGVycyI6WyJnb29nbGUiXX0sInVzZXJfbWV0YWRhdGEiOnsiYXZhdGFyX3VybCI6Imh0dHBzOi8vbGgzLmdvb2dsZXVzZXJjb250ZW50LmNvbS9hL0FDZzhvY0pNNS15T0Q1d0w1dlh4dm9MVThfV1ZYbjN2VmJLNFQxSmV0eTdzbGlrU012OVRsZz1zOTYtYyIsImN1c3RvbV9jbGFpbXMiOnsiaGQiOiJmbG91ZW5jZS5jb20ifSwiZW1haWwiOiJsdWthQGZsb3VlbmNlLmNvbSIsImVtYWlsX3ZlcmlmaWVkIjp0cnVlLCJmdWxsX25hbWUiOiJMdWthIEtuaWVsaW5nIiwiaXNzIjoiaHR0cHM6Ly9hY2NvdW50cy5nb29nbGUuY29tIiwibmFtZSI6Ikx1a2EgS25pZWxpbmciLCJwaG9uZV92ZXJpZmllZCI6ZmFsc2UsInBpY3R1cmUiOiJodHRwczovL2xoMy5nb29nbGV1c2VyY29udGVudC5jb20vYS9BQ2c4b2NKTTUteU9ENXdMNXZYeHZvTFU4X1dWWG4zdlZiSzRUMUpldHk3c2xpa1NNdjlUbGc9czk2LWMiLCJwcm92aWRlcl9pZCI6IjExNzA5Mjk3NDkxNTU3NDI2ODQ5NiIsInN1YiI6IjExNzA5Mjk3NDkxNTU3NDI2ODQ5NiJ9LCJyb2xlIjoiYXV0aGVudGljYXRlZCIsImFhbCI6ImFhbDEiLCJhbXIiOlt7Im1ldGhvZCI6Im9hdXRoIiwidGltZXN0YW1wIjoxNzY2ODUwNjQ5fV0sInNlc3Npb25faWQiOiI1ZGJmNmNmNi03NDFmLTQ4YWEtYTQ4ZC05YzlhZWExMTcyNGIiLCJpc19hbm9ueW1vdXMiOmZhbHNlfQ.3plxgRl7R28Rn1tkN0p_lstag_Hb0vr3p9DXjL1cdfBk3eINe_IZxSgC21b2NeGAu6yJMP3jbtA5Bq2XwEkP2A';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkJob() {
    await supabase.auth.setSession({ access_token: USER_TOKEN, refresh_token: '' });

    const { data, error } = await supabase
        .from('scrape_jobs')
        .select('*')
        .eq('niche', 'Unblock Test')
        .order('created_at', { ascending: false })
        .limit(1);

    console.log('Unblock Test Job:', data);
    console.log('Error:', error);
}

checkJob();

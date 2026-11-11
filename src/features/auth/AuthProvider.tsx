import type { Session } from '@supabase/supabase-js';
import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import i18n from '@/i18n';
import type { LanguageCode } from '@/lib/database.types';
import { queryClient } from '@/lib/queryClient';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';
import {
  AuthContext,
  type AuthContextValue,
  type AuthStatus,
  type Profile,
  type ProfileStatus,
  type SignInErrorCode,
} from './auth-context';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>(isSupabaseConfigured ? 'loading' : 'signedOut');
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [profileStatus, setProfileStatus] = useState<ProfileStatus>(
    isSupabaseConfigured ? 'loading' : 'none',
  );
  const loadedProfileId = useRef<string | null>(null);

  const loadProfile = useCallback(async (userId: string) => {
    if (!supabase) return;
    loadedProfileId.current = userId;
    setProfileStatus('loading');
    const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (loadedProfileId.current !== userId) return;
    if (error) {
      setProfile(null);
      setProfileStatus('error');
      return;
    }
    setProfile(data ?? null);
    setProfileStatus(data ? 'ready' : 'error');
  }, []);

  useEffect(() => {
    if (!supabase) return;
    let active = true;

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (!active) return;
        setSession(data.session);
        setStatus(data.session ? 'signedIn' : 'signedOut');
        if (data.session && loadedProfileId.current !== data.session.user.id) {
          void loadProfile(data.session.user.id);
        }
      })
      .catch(() => {
        if (active) setStatus('signedOut');
      });

    const { data: subscription } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!active) return;
      setSession(nextSession);
      setStatus(nextSession ? 'signedIn' : 'signedOut');
      const nextId = nextSession?.user.id ?? null;
      if (!nextId) {
        loadedProfileId.current = null;
        setProfile(null);
        setProfileStatus('none');
        return;
      }
      if (loadedProfileId.current !== nextId) {
        // Deferred so the auth callback never awaits another Supabase request.
        setTimeout(() => {
          if (active) void loadProfile(nextId);
        }, 0);
      }
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, [loadProfile]);

  // Apply the language saved on the profile, so each user keeps their choice
  // across devices (the language detector covers the signed-out screens).
  useEffect(() => {
    if (profile && i18n.language !== profile.language) void i18n.changeLanguage(profile.language);
  }, [profile]);

  const setLanguage = useCallback(
    async (language: LanguageCode) => {
      await i18n.changeLanguage(language);
      const userId = session?.user.id;
      if (!userId || !supabase) return;
      const { error } = await supabase.from('profiles').update({ language }).eq('id', userId);
      if (!error) setProfile((current) => (current ? { ...current, language } : current));
    },
    [session],
  );

  const signIn = useCallback(async (email: string, password: string): Promise<SignInErrorCode | null> => {
    if (!supabase) return 'unknown';
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (!error) return null;
    return error.code === 'invalid_credentials' ? 'invalid' : 'unknown';
  }, []);

  const signOut = useCallback(async () => {
    queryClient.clear();
    // Anything the service worker cached for this session must go with it:
    // on a shared tablet the next person must not be served the previous
    // one's rows. The precache (the app shell itself) is kept so the app
    // still opens offline.
    if (typeof caches !== 'undefined') {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => !name.includes('precache'))
          .map((name) => caches.delete(name)),
      );
    }
    if (!supabase) return;
    await supabase.auth.signOut();
  }, []);

  const reloadProfile = useCallback(async () => {
    const userId = session?.user.id;
    if (userId) await loadProfile(userId);
  }, [loadProfile, session]);

  const value = useMemo<AuthContextValue>(
    () => ({ status, session, profile, profileStatus, signIn, setLanguage, signOut, reloadProfile }),
    [status, session, profile, profileStatus, signIn, setLanguage, signOut, reloadProfile],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

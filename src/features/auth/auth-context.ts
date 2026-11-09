import type { Session } from '@supabase/supabase-js';
import { createContext } from 'react';
import type { LanguageCode, Tables } from '@/lib/database.types';

export type Profile = Tables<'profiles'>;
export type AuthStatus = 'loading' | 'signedOut' | 'signedIn';
export type ProfileStatus = 'loading' | 'ready' | 'error' | 'none';
export type SignInErrorCode = 'invalid' | 'unknown';

export interface AuthContextValue {
  status: AuthStatus;
  session: Session | null;
  profile: Profile | null;
  profileStatus: ProfileStatus;
  signIn: (email: string, password: string) => Promise<SignInErrorCode | null>;
  setLanguage: (language: LanguageCode) => Promise<void>;
  signOut: () => Promise<void>;
  reloadProfile: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

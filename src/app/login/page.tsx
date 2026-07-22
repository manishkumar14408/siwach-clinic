'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Heart, Shield, Stethoscope } from 'lucide-react';
import { defaultPath } from '@/lib/permissions';
import logo from '@/assets/logo.png';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Login failed');
        return;
      }

      router.push(defaultPath(data.data.role));
      router.refresh();
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex" style={{ background: '#f8f6f1' }}>
      {/* Left decorative panel */}
      <div
        className="hidden lg:flex flex-col justify-between w-[45%] p-12 relative overflow-hidden"
        style={{ background: 'linear-gradient(145deg, #3d6b4a 0%, #2c5237 50%, #1e3d28 100%)' }}
      >
        {/* Decorative circles */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-10" style={{ background: '#6aab7a' }} />
        <div className="absolute bottom-20 -right-20 w-80 h-80 rounded-full opacity-10" style={{ background: '#a3d9b0' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] rounded-full opacity-5" style={{ background: '#ffffff' }} />

        {/* Logo area */}
        <div className="relative z-10">
          <div className="inline-block rounded-2xl p-4 shadow-lg" style={{ background: 'rgba(255,255,255,0.96)' }}>
            <div className="relative overflow-hidden" style={{ height: 54, width: 119 }}>
              <Image src={logo} alt="Siwach Sanjeevani Hospital" fill sizes="119px" className="object-cover" priority />
            </div>
          </div>
          <p className="text-sm mt-3" style={{ color: 'rgba(255,255,255,0.5)' }}>Orthopaedic Hospital</p>
        </div>

        {/* Main content */}
        <div className="relative z-10 flex-1 flex flex-col justify-center py-16">
          <h1 className="font-display text-4xl font-semibold text-white leading-tight mb-6">
            Caring for Every<br />Step You Take
          </h1>
          <p className="text-base leading-relaxed mb-10" style={{ color: 'rgba(255,255,255,0.65)' }}>
            Advanced orthopaedic care with a compassionate touch. Managing patient health records with precision and care.
          </p>

          <div className="space-y-4">
            {[
              { icon: Shield, text: 'Secure & HIPAA-compliant records' },
              { icon: Heart, text: 'Patient-first approach to care' },
              { icon: Stethoscope, text: 'Complete orthopaedic management' },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: 'rgba(255,255,255,0.12)' }}>
                  <Icon size={15} className="text-white" />
                </div>
                <span className="text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>{text}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom */}
        <div className="relative z-10">
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
            © 2026 Siwach Sanjeevani Orthopaedic Hospital
          </p>
        </div>
      </div>

      {/* Right login panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md animate-slide-up">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <div className="relative overflow-hidden mx-auto mb-1" style={{ height: 46, width: 101 }}>
              <Image src={logo} alt="Siwach Sanjeevani Hospital" fill sizes="101px" className="object-cover" priority />
            </div>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>Orthopaedic Hospital</p>
          </div>

          <div className="card">
            <div className="mb-8">
              <h2 className="font-display text-2xl font-semibold mb-2" style={{ color: 'var(--color-text)' }}>
                Welcome back
              </h2>
              <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                Sign in to access the patient management system
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text)' }}>
                  Email address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="input-field"
                  placeholder="your@email.com"
                  required
                  autoComplete="email"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--color-text)' }}>
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    className="input-field pr-11"
                    placeholder="••••••••"
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors"
                    style={{ color: 'var(--color-text-light)' }}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 px-4 py-3 rounded-xl text-sm animate-fade-in"
                  style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger)' }}>
                  <span>⚠</span>
                  <span>{error}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full justify-center py-3"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing in...
                  </span>
                ) : 'Sign in'}
              </button>
            </form>

            {/* Demo credentials */}
            {/*<div className="mt-6 p-4 rounded-xl" style={{ background: 'var(--color-primary-light)' }}>*/}
            {/*  <p className="text-xs font-medium mb-2" style={{ color: 'var(--color-primary-dark)' }}>*/}
            {/*    Demo credentials*/}
            {/*  </p>*/}
            {/*  <div className="space-y-1 text-xs" style={{ color: 'var(--color-primary-dark)', opacity: 0.8 }}>*/}
            {/*    <p>Admin: admin@siwachsanjeevani.com / admin123</p>*/}
            {/*    <p>Doctor: priya@siwachsanjeevani.com / doctor123</p>*/}
            {/*  </div>*/}
            {/*</div>*/}
          </div>
        </div>
      </div>
    </div>
  );
}

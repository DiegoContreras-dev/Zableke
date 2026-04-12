"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from './components/Input';
import { Button } from './components/Button';
import { Checkbox } from './components/Checkbox';
import { Alert } from './components/Alert';
import { ImageWithFallback } from './components/figma/ImageWithFallback';
import { createTutorSession, hasTutorSession } from '@/front/modules/auth/services/session';

export default function App() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showError, setShowError] = useState(false);

  useEffect(() => {
    if (hasTutorSession()) {
      router.replace('/tutor');
    }
  }, [router]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    // Validar que sea correo institucional
    if (!email.endsWith('@ucn.cl') && !email.endsWith('@alumnos.ucn.cl')) {
      setShowError(true);
      return;
    }

    setShowError(false);
    setIsLoading(true);

    // Simular carga
    setTimeout(() => {
      createTutorSession(rememberMe);
      setIsLoading(false);
      router.replace('/tutor');
    }, 2000);
  };

  const handleGoogleLogin = () => {
    console.log('Google institutional login');
  };

  return (
    <div className="min-h-screen overflow-x-hidden lg:h-screen lg:overflow-hidden flex flex-col lg:flex-row">
      {/* Left Column - Visual Institutional */}
      <div className="hidden lg:flex lg:w-1/2 xl:w-[55%] relative overflow-hidden">
        {/* Background Image */}
        <ImageWithFallback
          src="https://images.unsplash.com/photo-1579469856126-4b0713c8300e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1920"
          alt="Estudiantes en biblioteca - Departamento de Éxito Académico"
          className="absolute inset-0 w-full h-full object-cover"
        />

        {/* Overlay */}
        <div className="absolute inset-0 bg-[#23415B]/75"></div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center items-start px-16 xl:px-24 text-white">
          <h1 className="text-5xl xl:text-6xl font-semibold mb-6 leading-tight">
            Sistema de<br />Tutorías UCN
          </h1>
          <p className="text-xl xl:text-2xl text-white/90 max-w-md font-light">
            Departamento de Éxito Académico
          </p>
          <p className="text-lg text-white/80 mt-2 font-light">
            Universidad Católica del Norte, Sede Coquimbo
          </p>
        </div>
      </div>

      {/* Right Column - Login Form */}
      <div className="flex-1 flex items-center justify-center bg-white px-4 py-6 sm:px-6 lg:px-10 xl:px-12 lg:py-6">
        <div className="w-full max-w-md">
          {/* Mobile Header */}
          <div className="lg:hidden mb-8 text-center">
            <h1 className="text-2xl sm:text-3xl font-semibold text-[#23415B] mb-2 leading-tight">
              Sistema de Tutorías
              <span className="block">UCN</span>
            </h1>
            <p className="text-sm text-[#6B7280]">
              Departamento de Éxito Académico
            </p>
          </div>

          {/* Logo Éxito Académico */}
          <div className="mb-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/imports/logo_exito_academico.png"
              alt="Departamento Éxito Académico UCN"
              className="w-20 h-20 lg:w-24 lg:h-24 mx-auto lg:mx-0"
            />
          </div>

          {/* Form Header */}
          <div className="mb-6">
            <h2 className="text-2xl lg:text-3xl font-semibold text-[#23415B] mb-2">
              Iniciar sesión
            </h2>
            <p className="text-[#6B7280]">
              Acceso para tutores y coordinación académica
            </p>
          </div>

          {/* Error Alert */}
          {showError && (
            <div className="mb-6">
              <Alert variant="error">
                Debes usar un correo institucional UCN
              </Alert>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4 lg:space-y-5">
            <Input
              type="email"
              label="Correo electrónico institucional"
              placeholder="nombre.apellido@ucn.cl"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              hasError={showError}
              required
            />

            <Input
              type="password"
              label="Contraseña"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />

            {/* Remember Me & Forgot Password */}
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <Checkbox
                label="Recordar sesión"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
              />
              <a
                href="#"
                className="self-end text-sm text-[#23415B] hover:text-[#E5742A] transition-colors duration-150 font-medium"
              >
                ¿Olvidaste tu contraseña?
              </a>
            </div>

            {/* Primary Button */}
            <Button
              type="submit"
              variant="primary"
              isLoading={isLoading}
            >
              Ingresar
            </Button>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-[#E5E7EB]"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white text-[#6B7280]">o</span>
              </div>
            </div>

            {/* Secondary Button - Google */}
            <Button
              type="button"
              variant="secondary"
              onClick={handleGoogleLogin}
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path
                  fill="currentColor"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="currentColor"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="currentColor"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                />
                <path
                  fill="currentColor"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              <span className="text-center leading-tight">Acceder con Google institucional</span>
            </Button>

            {/* Support Message */}
            <p className="text-sm text-center text-[#6B7280] mt-4">
              Solo correos @ucn.cl y @alumnos.ucn.cl
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

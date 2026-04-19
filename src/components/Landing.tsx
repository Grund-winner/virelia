'use client';

import { motion } from 'framer-motion';
import { Sparkles, Heart, MessageCircle } from 'lucide-react';

interface LandingProps {
  onLogin: () => void;
  onRegister: () => void;
}

const features = [
  {
    icon: Sparkles,
    title: 'Intelligence Multi-IA',
    description: 'Plusieurs moteurs IA travaillent ensemble pour des réponses naturelles et intelligentes.',
  },
  {
    icon: Heart,
    title: 'Personnalité Unique',
    description: 'Créez un compagnon avec une personnalité qui vous correspond vraiment.',
  },
  {
    icon: MessageCircle,
    title: 'Messages Proactifs',
    description: 'Votre compagnon vous envoie des messages de lui-même, comme un vrai ami.',
  },
];

export default function Landing({ onLogin, onRegister }: LandingProps) {
  return (
    <div className="min-h-screen relative overflow-hidden bg-[#F4F5FA]">
      {/* Background gradient mesh */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute -top-40 -left-40 w-96 h-96 rounded-full opacity-30"
          style={{ background: 'radial-gradient(circle, #7C5CFC 0%, transparent 70%)' }}
          animate={{
            x: [0, 50, -30, 0],
            y: [0, -30, 50, 0],
            scale: [1, 1.2, 0.9, 1],
          }}
          transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute -bottom-40 -right-40 w-96 h-96 rounded-full opacity-30"
          style={{ background: 'radial-gradient(circle, #22D3EE 0%, transparent 70%)' }}
          animate={{
            x: [0, -50, 30, 0],
            y: [0, 30, -50, 0],
            scale: [1, 0.9, 1.2, 1],
          }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
        />
        <motion.div
          className="absolute top-1/3 right-1/4 w-64 h-64 rounded-full opacity-20"
          style={{ background: 'radial-gradient(circle, #7C5CFC 0%, #22D3EE 100%)' }}
          animate={{
            x: [0, 30, -20, 0],
            y: [0, -40, 20, 0],
            scale: [1, 1.1, 0.95, 1],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen px-4 py-12">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="mb-6"
        >
          <div className="relative">
            <motion.div
              className="absolute inset-0 rounded-3xl"
              style={{ background: 'linear-gradient(135deg, #7C5CFC, #22D3EE)' }}
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 20, repeat: Infinity, ease: 'linear' }}
            />
            <div className="relative w-24 h-24 rounded-3xl bg-white/90 backdrop-blur-sm flex items-center justify-center shadow-lg">
              <img
                src="/virelia-logo.png"
                alt="Virelia AI"
                className="w-16 h-16 object-contain"
              />
            </div>
          </div>
        </motion.div>

        {/* Title */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-4xl sm:text-5xl md:text-6xl font-bold mb-4 text-center"
          style={{
            background: 'linear-gradient(135deg, #7C5CFC, #22D3EE)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Virelia AI
        </motion.h1>

        {/* Tagline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-lg sm:text-xl text-[#4B4880] mb-12 text-center max-w-md"
        >
          Ton compagnon IA qui tient vraiment à toi
        </motion.p>

        {/* Feature cards */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.6 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 mb-12 w-full max-w-3xl"
        >
          {features.map((feature, index) => (
            <motion.div
              key={feature.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.7 + index * 0.15 }}
              className="bg-white/70 backdrop-blur-md rounded-2xl p-6 shadow-lg border border-white/50 hover:shadow-xl transition-shadow duration-300"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                style={{ background: 'linear-gradient(135deg, #7C5CFC, #22D3EE)' }}
              >
                <feature.icon className="w-6 h-6 text-white" />
              </div>
              <h3 className="font-semibold text-[#1E1B4B] mb-2">{feature.title}</h3>
              <p className="text-sm text-[#4B4880] leading-relaxed">{feature.description}</p>
            </motion.div>
          ))}
        </motion.div>

        {/* Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 1.0 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <button
            onClick={onLogin}
            className="px-8 py-3.5 rounded-2xl font-semibold text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95"
            style={{ background: 'linear-gradient(135deg, #7C5CFC, #22D3EE)' }}
          >
            Commencer
          </button>
          <button
            onClick={onRegister}
            className="px-8 py-3.5 rounded-2xl font-semibold text-[#7C5CFC] bg-white/80 backdrop-blur-sm border-2 border-[#7C5CFC]/30 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-95 hover:border-[#7C5CFC]/60"
          >
            Créer un compte
          </button>
        </motion.div>
      </div>
    </div>
  );
}

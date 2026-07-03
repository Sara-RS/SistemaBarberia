/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

// Cargar variables de entorno
dotenv.config();

const app = express();
const PORT = 3000;

// Middleware para JSON
app.use(express.json());

// --- LAZY INITIALIZATION OF GEMINI SDK ---
let aiClient: GoogleGenAI | null = null;

function getGeminiClient(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('La variable de entorno GEMINI_API_KEY no está configurada.');
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  }
  return aiClient;
}

// --- API ENDPOINTS ---

// 1. Healthcheck
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 2. IA - Asesor de Negocio (Analiza métricas y da consejos estratégicos)
app.post('/api/ai/advise', async (req, res) => {
  try {
    const { metrics } = req.body;
    
    if (!metrics) {
      return res.status(400).json({ error: 'Faltan las métricas del negocio.' });
    }

    const ai = getGeminiClient();
    
    const prompt = `
      Actúa como un Consultor de Negocios Senior especializado en Barberías y Salones de Belleza de Alta Gama.
      Analiza las siguientes métricas operacionales de nuestra barbería:
      
      - Ventas Totales del Día: $${metrics.todaySales || 0} MXN
      - Citas Agendadas Hoy: ${metrics.todayAppointments || 0} citas
      - Clientes Activos Totales: ${metrics.activeClients || 0} clientes
      - Productos en Stock Crítico: ${metrics.criticalStockCount || 0} productos
      - Historial de Reservas: ${JSON.stringify(metrics.recentAppointments || [])}
      - Servicios más Vendidos: Corte de Cabello (60%), Perfilado de Barba (30%), Faciales (10%).

      Por favor, genera un análisis ejecutivo breve, directo y elegante que incluya:
      1. Diagnóstico del día (cómo se ve el rendimiento).
      2. 3 acciones estratégicas concretas (inventario, promociones o asignación de personal) redactadas de forma profesional, imitando el estilo pulido de Stripe/Vercel.
      3. Un consejo de marketing o retención de clientes rápido.

      IMPORTANTE: Responde en formato de texto enriquecido con formato markdown limpio, usando un tono profesional, inspirador y minimalista. Evita rodeos innecesarios o saludos genéricos.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        temperature: 0.7,
      },
    });

    const advice = response.text || 'No se pudo generar el consejo estratégico en este momento.';
    res.json({ advice });
  } catch (error: any) {
    console.error('Error in /api/ai/advise:', error.message);
    res.status(500).json({ 
      error: 'Error al comunicarse con Gemini AI.', 
      details: error.message,
      suggestConfig: !process.env.GEMINI_API_KEY 
    });
  }
});

// 3. IA - Predicción de Demanda de Agenda Inteligente
app.post('/api/ai/predict', async (req, res) => {
  try {
    const { dateStr, currentBookingsCount } = req.body;
    
    if (!dateStr) {
      return res.status(400).json({ error: 'Falta la fecha de análisis.' });
    }

    const ai = getGeminiClient();

    const dateObj = new Date(dateStr + 'T00:00:00');
    const days = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const dayOfWeek = days[dateObj.getDay()];

    const prompt = `
      Actúa como un algoritmo predictivo inteligente de ocupación para Barberías Pro.
      Analiza los siguientes parámetros para predecir la ocupación y comportamiento del cliente para el día de la semana:
      
      - Fecha solicitada: ${dateStr}
      - Día de la semana: ${dayOfWeek}
      - Citas ya reservadas para este día: ${currentBookingsCount || 0} citas

      Por favor, genera una respuesta en JSON estructurado que tenga exactamente la siguiente estructura de campos (no incluyas markdown backticks en tu respuesta, solo el JSON puro):
      {
        "estimatedOccupancyPercent": número entre 0 y 100 de ocupación estimada,
        "peakHours": ["lista de strings con rango de horas pico estimadas para un " + "${dayOfWeek}"],
        "demandLevel": "Alta" o "Media" o "Baja",
        "staffingRecommendation": "string corto sugiriendo si se necesitan más barberos en turno o si está balanceado",
        "dynamicPricingSuggestion": "string corto de estrategia de precios (e.g., descuento horas valle, tarifa normal, etc.)"
      }
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.3,
      },
    });

    const resultText = response.text || '{}';
    res.json(JSON.parse(resultText.trim()));
  } catch (error: any) {
    console.error('Error in /api/ai/predict:', error.message);
    res.status(500).json({ 
      error: 'Error al calcular la predicción inteligente.', 
      details: error.message,
      suggestConfig: !process.env.GEMINI_API_KEY 
    });
  }
});

// --- VITE MIDDLEWARE CONFIGURATION ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Barbería Pro Server] Running on http://localhost:${PORT} in ${process.env.NODE_ENV || 'development'} mode.`);
  });
}

startServer();

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import crypto from 'crypto';

interface CaptchaChallengeRecord {
  answerHash: string;
  expiresAt: number;
}

export interface CaptchaChallengeResponse {
  captchaId: string;
  imageDataUrl: string;
  expiresInSeconds: number;
}

export interface CaptchaVerificationResult {
  valid: boolean;
  error?: string;
}

/**
 * Servicio OOP gratuito y autónomo de CAPTCHA visual en SVG.
 * Genera desafíos gráficos distorsionados de un solo uso con expiración temporal
 * y verificación criptográfica HMAC-SHA256 en el servidor.
 */
export class SvgCaptchaService {
  private static readonly ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  private static readonly CODE_LENGTH = 5;
  private static readonly TTL_MS = 3 * 60 * 1000; // 3 minutos
  private static readonly MAX_CHALLENGES = 1000;
  private static readonly CHAR_PALETTE = [
    '#0F2A56',
    '#143D78',
    '#1C519B',
    '#0E7490',
    '#1E3A8A',
    '#1D4ED8',
  ];

  private readonly secretKey: string;
  private readonly challenges: Map<string, CaptchaChallengeRecord> = new Map();

  constructor() {
    this.secretKey =
      (process.env.SESSION_SECRET || '').trim() || crypto.randomBytes(32).toString('hex');
  }

  private pruneExpired(): void {
    const now = Date.now();
    for (const [id, entry] of this.challenges.entries()) {
      if (entry.expiresAt <= now) {
        this.challenges.delete(id);
      }
    }

    if (this.challenges.size >= SvgCaptchaService.MAX_CHALLENGES) {
      const oldestKey = this.challenges.keys().next().value;
      if (oldestKey) {
        this.challenges.delete(oldestKey);
      }
    }
  }

  private hashAnswer(captchaId: string, normalizedCode: string): string {
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(`${captchaId}:${normalizedCode}`)
      .digest('hex');
  }

  private generateRandomCode(): string {
    let result = '';
    for (let i = 0; i < SvgCaptchaService.CODE_LENGTH; i++) {
      const idx = crypto.randomInt(0, SvgCaptchaService.ALPHABET.length);
      result += SvgCaptchaService.ALPHABET[idx];
    }
    return result;
  }

  private buildSvgDataUrl(code: string): string {
    const width = 220;
    const height = 64;

    // Líneas curvas de interferencia
    const curvePaths: string[] = [];
    for (let i = 0; i < 4; i++) {
      const y1 = crypto.randomInt(10, height - 10);
      const y2 = crypto.randomInt(10, height - 10);
      const cx1 = crypto.randomInt(40, 110);
      const cy1 = crypto.randomInt(4, height - 4);
      const cx2 = crypto.randomInt(110, 185);
      const cy2 = crypto.randomInt(4, height - 4);
      const strokeColor =
        SvgCaptchaService.CHAR_PALETTE[crypto.randomInt(0, SvgCaptchaService.CHAR_PALETTE.length)];
      curvePaths.push(
        `<path d="M 6 ${y1} C ${cx1} ${cy1}, ${cx2} ${cy2}, ${width - 6} ${y2}" fill="none" stroke="${strokeColor}" stroke-width="1.6" stroke-opacity="0.32" />`
      );
    }

    // Puntos de ruido sutiles
    const noiseDots: string[] = [];
    for (let i = 0; i < 28; i++) {
      const cx = crypto.randomInt(6, width - 6);
      const cy = crypto.randomInt(6, height - 6);
      const r = (crypto.randomInt(8, 18) / 10).toFixed(1);
      noiseDots.push(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="#1C519B" fill-opacity="0.22" />`);
    }

    // Caracteres con rotación y desplazamiento vertical aleatorio
    const charElements = code
      .split('')
      .map((char, idx) => {
        const x = 28 + idx * 38 + crypto.randomInt(-3, 4);
        const y = 41 + crypto.randomInt(-5, 6);
        const angle = crypto.randomInt(-20, 21);
        const fontSize = crypto.randomInt(26, 31);
        const color =
          SvgCaptchaService.CHAR_PALETTE[
            crypto.randomInt(0, SvgCaptchaService.CHAR_PALETTE.length)
          ];

        return `<text x="${x}" y="${y}" fill="${color}" font-family="Georgia, 'Times New Roman', serif" font-weight="800" font-size="${fontSize}" letter-spacing="2" transform="rotate(${angle} ${x} ${y})">${char}</text>`;
      })
      .join('');

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <defs>
    <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#F1F5F9" />
      <stop offset="100%" stop-color="#E2E8F0" />
    </linearGradient>
  </defs>
  <rect width="${width}" height="${height}" rx="10" fill="url(#bg)" />
  ${noiseDots.join('')}
  ${curvePaths.join('')}
  ${charElements}
</svg>`;

    const base64 = Buffer.from(svg, 'utf8').toString('base64');
    return `data:image/svg+xml;base64,${base64}`;
  }

  public generateChallenge(): CaptchaChallengeResponse {
    this.pruneExpired();

    const captchaId = `cap-${crypto.randomUUID()}`;
    const code = this.generateRandomCode();
    const answerHash = this.hashAnswer(captchaId, code);
    const expiresAt = Date.now() + SvgCaptchaService.TTL_MS;

    this.challenges.set(captchaId, { answerHash, expiresAt });

    return {
      captchaId,
      imageDataUrl: this.buildSvgDataUrl(code),
      expiresInSeconds: Math.floor(SvgCaptchaService.TTL_MS / 1000),
    };
  }

  public verifyChallenge(captchaId: string, userAnswer: string): CaptchaVerificationResult {
    const cleanId = (captchaId || '').trim();
    const cleanAnswer = (userAnswer || '').trim().toUpperCase();

    if (!cleanId || !cleanAnswer) {
      return {
        valid: false,
        error: 'Ingresa el código CAPTCHA mostrado en la imagen.',
      };
    }

    const record = this.challenges.get(cleanId);
    // Consumo inmediato de un solo uso para evitar ataques de repetición o fuerza bruta
    this.challenges.delete(cleanId);

    if (!record) {
      return {
        valid: false,
        error: 'El código CAPTCHA no es válido o ya fue utilizado. Genera uno nuevo.',
      };
    }

    if (record.expiresAt <= Date.now()) {
      return {
        valid: false,
        error: 'El código CAPTCHA expiró. Ingresa el nuevo código generado.',
      };
    }

    const providedHash = this.hashAnswer(cleanId, cleanAnswer);
    const a = Buffer.from(providedHash, 'hex');
    const b = Buffer.from(record.answerHash, 'hex');

    if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
      return {
        valid: false,
        error: 'El código CAPTCHA es incorrecto. Intenta nuevamente.',
      };
    }

    return { valid: true };
  }
}

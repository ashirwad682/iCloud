import { UAParser } from 'ua-parser-js';
import { Request } from 'express';

export interface DeviceInfo {
  browser: string;
  os: string;
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  deviceName: string;
  ipAddress: string;
  approximateLocation: string;
}

export function parseDeviceInfo(req: Request): DeviceInfo {
  const userAgentString = req.headers['user-agent'] || '';
  const parser = new UAParser(userAgentString);
  const result = parser.getResult();

  const browser = result.browser.name
    ? `${result.browser.name} ${result.browser.major || ''}`.trim()
    : 'Unknown Browser';

  const os = result.os.name
    ? `${result.os.name} ${result.os.version || ''}`.trim()
    : 'Unknown OS';

  let deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown' = 'desktop';
  if (result.device.type === 'mobile') deviceType = 'mobile';
  else if (result.device.type === 'tablet') deviceType = 'tablet';
  else if (!result.device.type && !result.os.name) deviceType = 'unknown';

  let deviceName = `${browser} on ${os}`;
  if (result.device.vendor || result.device.model) {
    deviceName = `${result.device.vendor || ''} ${result.device.model || ''}`.trim();
  }

  // Extract client IP (handle proxies & Cloudflare/reverse proxy headers)
  const forwarded = req.headers['x-forwarded-for'];
  let ipAddress = '127.0.0.1';
  if (typeof forwarded === 'string') {
    ipAddress = forwarded.split(',')[0].trim();
  } else if (req.socket.remoteAddress) {
    ipAddress = req.socket.remoteAddress;
  }

  return {
    browser,
    os,
    deviceType,
    deviceName,
    ipAddress,
    approximateLocation: 'Local / Secure Network',
  };
}

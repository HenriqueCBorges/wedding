// "Adicionar à agenda": link do Google Agenda e arquivo .ics (iPhone, Outlook e outros).

export const VENUE = 'Cerimonial Casa Rio, R. João Marques de Oliveira, 53, Buraquinho, Lauro de Freitas - BA';
export const MAP_URL = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(VENUE);

const EVENT = {
  title: 'Casamento Stefania & Henrique',
  start: '20270822T183000Z', // 22/08/2027 15h30 em Brasília
  end: '20270823T020000Z', // 23h00 em Brasília
  details: 'Celebração do casamento de Stefania & Henrique. https://casamento-stefania-henrique.web.app',
};

export function googleCalendarUrl() {
  const p = new URLSearchParams({
    action: 'TEMPLATE',
    text: EVENT.title,
    dates: `${EVENT.start}/${EVENT.end}`,
    details: EVENT.details,
    location: VENUE,
    ctz: 'America/Bahia',
  });
  return `https://calendar.google.com/calendar/render?${p}`;
}

const icsEscape = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');

export function downloadIcs() {
  const now = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Stefania e Henrique//Casamento//PT-BR',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    'UID:casamento-stefania-henrique-20270822@web.app',
    `DTSTAMP:${now}`,
    `DTSTART:${EVENT.start}`,
    `DTEND:${EVENT.end}`,
    `SUMMARY:${icsEscape(EVENT.title)}`,
    `DESCRIPTION:${icsEscape(EVENT.details)}`,
    `LOCATION:${icsEscape(VENUE)}`,
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    'DESCRIPTION:Amanhã é o casamento de Stefania & Henrique!',
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar;charset=utf-8' }));
  a.download = 'casamento-stefania-henrique.ics';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

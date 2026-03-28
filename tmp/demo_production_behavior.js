// Simulação do comportamento ATUAL do código (Produção)
const nodeIcal = require('node-ical');

// Dados simulados do iCal que recebemos do Airbnb
const icalData = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART;VALUE=DATE:20260405
DTEND;VALUE=DATE:20260407
SUMMARY:Reserva Airbnb
UID:test-uid
END:VEVENT
END:VCALENDAR`;

const data = nodeIcal.parseICS(icalData);
const ev = data[Object.keys(data)[0]];

console.log('--- iCal Original (Airbnb) ---');
console.log('DTSTART:', ev.start); // Abril 5, 2026
console.log('DTEND:', ev.end);     // Abril 7, 2026 (Exclusivo)

// Lógica atual (Produção)
const checkoutDate = new Date(ev.end);
checkoutDate.setDate(checkoutDate.getDate() - 1); // <--- A LINHA EM QUESTÃO
const checkinDate = new Date(ev.start);

console.log('\n--- Como o Aluga Fácil está salvando hoje (Produção) ---');
console.log('Check-in no Banco:', checkinDate.toISOString().split('T')[0]);
console.log('Check-out no Banco:', checkoutDate.toISOString().split('T')[0]);

const diffTime = Math.abs(checkoutDate.getTime() - checkinDate.getTime());
const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) || 1;
console.log('Noites Calculadas:', diffDays);

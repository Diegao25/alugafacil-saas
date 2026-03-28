import axios from 'axios';
import ical from 'node-ical';

const url = 'https://www.airbnb.com.br/calendar/ical/1649267974441596177.ics?t=1d1b891e7fa24bb29720fb8c673f2f3a';

async function testSync() {
  try {
    console.log(`[Test] Buscando calendário: ${url}`);
    
    const response = await axios.get(url, { 
      timeout: 15000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/calendar, text/plain, */*'
      }
    });
    
    console.log(`[Test] HTTP Status: ${response.status}`);
    console.log(`[Test] Content-Type: ${response.headers['content-type']}`);
    console.log(`[Test] Tamanho: ${response.data?.length || 0} bytes`);
    
    if (response.data) {
      const data = ical.parseICS(response.data);
      let eventCount = 0;
      for (const k in data) {
        if (data[k].type === 'VEVENT') {
          eventCount++;
          if (eventCount <= 5) {
            console.log(`[Test] Evento #${eventCount}: UID=${data[k].uid}, Summary=${data[k].summary}, Start=${data[k].start}`);
          }
        }
      }
      console.log(`[Test] Total de eventos encontrados: ${eventCount}`);
    }
  } catch (error: any) {
    console.error(`[Test] Erro: ${error.message}`);
    if (error.response) {
      console.error(`[Test] Response data: ${error.response.data}`);
      console.error(`[Test] Response status: ${error.response.status}`);
    }
  }
}

testSync();

const axios = require('axios');
const cheerio = require('cheerio');

async function getAircraftData(registration) {
  try {
      const url = `https://www.airliners.net/search?keywords=${encodeURIComponent(registration)}`;
      const response = await axios.get(url);
      
      const $ = cheerio.load(response.data);

      const imageElement = $('div.ps-v2-results-col-photo img.lazy-load');
      const authorElement = $('a.ua-name-content').first();

      const image = imageElement.attr('src');
      const author = authorElement.text().trim();

      if (!image || !author) {
          throw new Error('Could not find the image or author information.');
      }

      return { image, author };
  } catch (error) {
      console.error('Error fetching aircraft data:', error.message);
      return null;
  }
}

export default async function handler(req, res) {
  if (req.method === 'GET') {
    const { registration } = req.query;

    if (!registration) {
        return res.status(400).json({ error: 'Missing registration parameter.' });
    }

    const data = await getAircraftData(registration);

    if (data) {
        res.status(200).json(data);
    } else {
        res.status(200).json({ image: '/not-found.png', author: '' });
    }
  } else {
    res.status(405).json({ error: 'Method not allowed.' });
  }
}
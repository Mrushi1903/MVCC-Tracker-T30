// Player image map — short_name → filename in /public/players/
export const PLAYER_IMAGES: Record<string, string> = {
  'Amar':     'Amarendra Nuvvala.jpeg',
  'Akshay':   'Akshay Raju.jpeg',
  'Hemanth':  'Hemanth Kasa.jpeg',
  'Karthik':  'Karthik Balakrishna.jpeg',
  'Koushik':  'Koushik Dhanekula.jpeg',
  'Mahendra': 'Mahender Bureddy.jpeg',
  'Naveen':   'Naveen Kumar Peddi.jpeg',
  'Nikhil':   'Nikhila Pasula.jpeg',
  'Nithin':   'Nithin Reddy Musku.jpeg',
  'Raheel':   'Raheel Shaik.jpeg',
  'Rahul':    'Rahul Menon.jpeg',
  'Ravi':     'Ravi Kumar Pattipati.jpeg',
  'Rohith':   'Rohith Maddipati.jpeg',
  'Rupendra': 'Rupendra Chowdary.jpeg',
  'Rushi':    'Rushi Vardan Reddy Maddi.jpeg',
  'Manoj':    'Sai Manoj Kagolanu.jpeg',
  'Saran':    'Saran Damacharla.jpeg',
  'Siddarth': 'Siddharth Chawla.jpeg',
  'Gani':     '(Gani) Siva Ganesh Asodi.jpeg',
  'Suman':    'Suman Reddy Gaddam.jpeg',
  'Viswa':    'Vishwanath Kasu.jpeg',
  'Yeswanth': 'Yashwant Kumar.jpeg',
  'Naresh':   'Naresh Sundar.jpeg',
  'Vamsi':    'Vamsi Krishna Koneru.jpeg',
}

export function getPlayerImage(shortName: string): string | null {
  const filename = PLAYER_IMAGES[shortName]
  if (!filename) return null
  return `/players/${encodeURIComponent(filename)}`
}

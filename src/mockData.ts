export interface Venue {
  id: string;
  name: string;
  location: string;
  capacity_min: number;
  capacity_max: number;
  price_per_meniu: number;
  description: string;
  image: string;
}

export interface Booking {
  id: string;
  venue_id: string;
  date: string;
  status: 'confirmat' | 'in_asteptare';
  client: string;
}

export const mockVenues: Venue[] = [
  {
    id: 'pallas-vicov',
    name: 'Pallas Vicov',
    location: 'Vicovu de Sus',
    capacity_min: 150,
    capacity_max: 450,
    price_per_meniu: 80,
    description: 'O sală recunoscută pentru rafinament și evenimente de amploare în zona Vicov.',
    image: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'roka',
    name: 'Roka',
    location: 'Vicovu de Sus',
    capacity_min: 100,
    capacity_max: 300,
    price_per_meniu: 85,
    description: 'Design modern, atmosferă contemporană și servicii premium pentru nunți memorabile.',
    image: 'https://images.unsplash.com/photo-1469371670807-013ccf25f16a?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'poiana-putna',
    name: 'Poiana Putna',
    location: 'Vicovu de Sus',
    capacity_min: 100,
    capacity_max: 250,
    price_per_meniu: 75,
    description: 'Cadru natural de poveste, aer curat și un stil rustic-elegant, perfect pentru mirii care vor ceva deosebit.',
    image: 'https://images.unsplash.com/photo-1549417229-aa67d3263c09?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'regal',
    name: 'Regal',
    location: 'Vicovu de Jos',
    capacity_min: 200,
    capacity_max: 500,
    price_per_meniu: 80,
    description: 'Spațiu generos și decor somptuos, ideal pentru nunțile mari din comunitate.',
    image: 'https://images.unsplash.com/photo-1511795409834-ef04bbd61622?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'grandiflora',
    name: 'Grandiflora',
    location: 'Fratauții Vechi',
    capacity_min: 150,
    capacity_max: 400,
    price_per_meniu: 85,
    description: 'Aranjamente florale deosebite și o arhitectură interioară spectaculoasă.',
    image: 'https://images.unsplash.com/photo-1505232458627-a8729468572d?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'ivory',
    name: 'Ivory',
    location: 'Putna',
    capacity_min: 120,
    capacity_max: 350,
    price_per_meniu: 90,
    description: 'Nuanțe calde de fildeș, finisaje moderne și un ring de dans extrem de spațios.',
    image: 'https://images.unsplash.com/photo-1464366400600-7168b8af9bc3?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'martin',
    name: 'Martin',
    location: 'Vicovu de Sus',
    capacity_min: 100,
    capacity_max: 250,
    price_per_meniu: 70,
    description: 'O locație primitoare, cu tradiție locală și preparate culinare de excepție.',
    image: 'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'stefan-cel-mare',
    name: 'Ștefan cel Mare',
    location: 'Vicovu de Jos',
    capacity_min: 150,
    capacity_max: 450,
    price_per_meniu: 75,
    description: 'O sală clasică, elegantă, ce oferă un raport excelent calitate-preț pentru evenimente mari.',
    image: 'https://images.unsplash.com/photo-1527529482837-4698179dc6ce?auto=format&fit=crop&w=800&q=80'
  },
  {
    id: 'grand-salon-noblesse',
    name: 'Grand Salon Noblesse',
    location: 'Vicovu de Sus',
    capacity_min: 200,
    capacity_max: 600,
    price_per_meniu: 95,
    description: 'Lux absolut, candelabre spectaculoase și servicii de înaltă clasă pentru nunți de revistă.',
    image: 'https://images.unsplash.com/photo-1519167758481-83f550bb49b3?auto=format&fit=crop&w=800&q=80'
  }
];

export const mockBookings: Booking[] = [
  { id: 'b1', venue_id: 'pallas-vicov', date: '2026-08-15', status: 'confirmat', client: 'Popescu Ionuț' },
  { id: 'b2', venue_id: 'pallas-vicov', date: '2027-07-17', status: 'confirmat', client: 'Schipor Andrei' },
  { id: 'b3', venue_id: 'roka', date: '2027-06-05', status: 'confirmat', client: 'Miri 2027' },
  { id: 'b4', venue_id: 'grand-salon-noblesse', date: '2028-05-20', status: 'confirmat', client: 'Rezervare Avans' },
  { id: 'b5', venue_id: 'poiana-putna', date: '2027-09-11', status: 'confirmat', client: 'Nuntă Putna' }
];

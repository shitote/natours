import axios from 'axios';
import { showAlert } from './alert';

const stripe = Stripe(
  'pk_test_51O06ZyHEUyJT5PDBJOSXJUXARLUGewg898AQkskpeFMLy7LhmCN9I8WS1RVbuwpafewmmKqPFw6hRANFETxWBO9g00p3Afaqw5',
);

export const bookTour = async (tourId) => {
  try {
    // 1) Get checkout session from API
    const session = await axios(`/api/v2/bookings/checkout-session/${tourId}`);

    // 2) Create checkout from + chanre credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id,
    });
  } catch (err) {
    console.log(err);
    showAlert('error', err);
  }
};

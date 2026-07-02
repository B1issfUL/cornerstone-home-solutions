import Header from './components/Header.jsx';
import Hero from './components/Hero.jsx';
import HowItWorks from './components/HowItWorks.jsx';
import Benefits from './components/Benefits.jsx';
import Contact from './components/Contact.jsx';
import Footer from './components/Footer.jsx';

export default function App() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <HowItWorks />
        <Benefits />
        <Contact />
      </main>
      <Footer />
    </>
  );
}

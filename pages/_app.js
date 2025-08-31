import '../styles/globals.css';

export default function MyApp({ Component, pageProps }) {
  return <div className="bg-background text-text min-h-screen"><Component {...pageProps} /></div>;
}

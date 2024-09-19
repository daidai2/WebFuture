import type { AppProps } from 'next/app';
import '../public/styles/globals.css';
import { VersionProvider } from './UIP/GlobalVar/VersionContext';

function MyApp({ Component, pageProps }: AppProps) {
  return (
    <VersionProvider>
      <Component {...pageProps} />
    </VersionProvider>
  );
}

export default MyApp;

import '@sushiswap/ui13/index.css'

import React, { FC } from 'react'

import { Header } from '../ui/Header'
import { WagmiProvider } from '../ui/WagmiProvider'
import { PersistQueryClientProvider } from '../ui/PersistQueryClientProvider'
import Head from 'next/head'
import { AppProps } from 'next/app'

const MyApp: FC<AppProps> = ({ Component, pageProps }) => {
  return (
    <>
      <Head>
        <link rel="apple-touch-icon" sizes="180x180" href="/swap13/apple-touch-icon.png?v=1" />
        <link rel="icon" type="image/png" sizes="32x32" href="/swap13/favicon-32x32.png?v=1" />
        <link rel="icon" type="image/png" sizes="16x16" href="/swap13/favicon-16x16.png?v=1" />
        <link rel="manifest" href="/swap13/manifest.json?v=1" />
        <link rel="mask-icon" href="/swap13/safari-pinned-tab.svg?v=1" color="#fa52a0" />
        <link rel="shortcut icon" href="/swap13/favicon.ico?v=1" />
      </Head>
      <WagmiProvider>
        <PersistQueryClientProvider>
          <Header />
          <Component {...pageProps} />
        </PersistQueryClientProvider>
      </WagmiProvider>
    </>
  )
}

export default MyApp
/* eslint-disable import/no-unresolved */
import Home from "../components/Home";
import Map from "../components/Map";
import FAQ from "../components/FAQ";
import Profile from "../components/profile/Profile";

import React from "react";
import Container from "react-bootstrap/Container";
import Row from "react-bootstrap/Row";
import Col from "react-bootstrap/Col";
import Image from "react-bootstrap/Image";
import Navbar from "react-bootstrap/Navbar";
import Button from "react-bootstrap/Button";
import {
  NETWORK_ID,
  CERAMIC_URL,
  IPFS_BOOTSTRAP_PEER,
  IPFS_PRELOAD_NODE,
} from "../lib/constants";
import { getContractsForChainOrThrow } from "@geo-web/sdk";
import { switchNetwork } from "../lib/wallets/connectors";
import { CeramicClient } from "@ceramicnetwork/http-client";
import { EthereumAuthProvider } from "@ceramicnetwork/blockchain-utils-linking";
import { getResolver as getKeyResolver } from "key-did-resolver";
import { DID } from "dids";
import { Ed25519Provider } from "key-did-provider-ed25519";

import { ethers } from "ethers";
import { useFirebase } from "../lib/Firebase";
import { useMultiAuth } from "@ceramicstudio/multiauth";

import { Framework, NativeAssetSuperToken } from "@superfluid-finance/sdk-core";
import { setSignerForSdkRedux } from "@superfluid-finance/sdk-redux";
import { Contracts } from "@geo-web/sdk/dist/contract/types";

import { getIpfs, providers } from "ipfs-provider";
import type { IPFS } from "ipfs-core-types";
import * as IPFSCore from "ipfs-core";
import { AuthManager } from "../lib/AuthManager";
import { AccountId } from "caip";

const { httpClient, jsIpfs } = providers;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getLibrary(provider: any) {
  return new ethers.providers.Web3Provider(provider);
}

function IndexPage() {
  const [authState, activate, deactivate] = useMultiAuth();

  const [licenseContract, setLicenseContract] =
    React.useState<Contracts["geoWebERC721LicenseContract"] | null>(null);
  const [auctionSuperApp, setAuctionSuperApp] =
    React.useState<Contracts["geoWebAuctionSuperAppContract"] | null>(null);
  const [fairLaunchClaimer, setFairLaunchClaimer] =
    React.useState<Contracts["geoWebFairLaunchClaimerContract"] | null>(null);
  const [ceramic, setCeramic] = React.useState<CeramicClient | null>(null);
  const [authManager, setAuthManager] =
    React.useState<AuthManager | null>(null);
  const [ipfs, setIPFS] = React.useState<IPFS | null>(null);
  const [library, setLibrary] =
    React.useState<ethers.providers.Web3Provider | null>(null);
  const { firebasePerf } = useFirebase();
  const [paymentToken, setPaymentToken] =
    React.useState<NativeAssetSuperToken | undefined>(undefined);
  const [sfFramework, setSfFramework] =
    React.useState<Framework | undefined>(undefined);

  const connectWallet = async () => {
    const _authState = await activate();

    const lib = getLibrary(_authState?.provider.state.provider);
    setLibrary(lib);

    const framework = await Framework.create({
      chainId: NETWORK_ID,
      provider: new ethers.providers.InfuraProvider(
        NETWORK_ID,
        process.env.NEXT_PUBLIC_INFURA_ID
      ),
    });
    setSfFramework(framework);
    const superToken = await framework.loadNativeAssetSuperToken("ETHx");
    setPaymentToken(superToken);
    setSignerForSdkRedux(NETWORK_ID, async () => lib as any);
  };

  const disconnectWallet = async () => {
    deactivate();
    AuthManager.clearCacaoSession();
  };

  React.useEffect(() => {
    if (authState.status !== "connected") {
      return;
    }

    const start = async () => {
      await switchNetwork(authState.connected.provider.state.provider);

      // Create AuthManager
      const accountId = new AccountId({
        address: authState.connected.accountID.address,
        chainId: `eip155:${NETWORK_ID}`,
      });
      const authManager = new AuthManager(
        accountId,
        authState.connected.provider.state.provider
      );
      const didKeyWithCap = await authManager.authenticate();
      setAuthManager(authManager);

      // Create Ceramic and DID with resolvers
      const ceramic = new CeramicClient(CERAMIC_URL);
      ceramic.did = didKeyWithCap;
      setCeramic(ceramic);

      if (!ipfs) {
        const { ipfs, provider, apiAddress } = await getIpfs({
          providers: [
            httpClient({
              loadHttpClientModule: () => require("ipfs-http-client"),
              apiAddress: "/ip4/127.0.0.1/tcp/5001",
            }),
            jsIpfs({
              loadJsIpfsModule: () => IPFSCore,
              options: {
                config: {
                  Bootstrap: [
                    IPFS_BOOTSTRAP_PEER,
                    "/dnsaddr/bootstrap.libp2p.io/p2p/QmNnooDu7bfjPFoTZYxMNLWUQJyrVwtbZg5gBMjTezGAJN",
                    "/dnsaddr/bootstrap.libp2p.io/p2p/QmbLHAnMoJPWSCR5Zhtx6BHJX9KiKNN6tpvbUcqanj75Nb",
                    "/dnsaddr/bootstrap.libp2p.io/p2p/QmZa1sAxajnQjVM8WjWXoMbmPd7NsWhfKsPkErzpm9wGkp",
                    "/dnsaddr/bootstrap.libp2p.io/p2p/QmQCU2EcMqAqQPR2i9bChDtGNJchTbq5TbXJJ16u19uLTa",
                    "/dnsaddr/bootstrap.libp2p.io/p2p/QmcZf59bWwK5XFi76CZX8cbJ4BhTzzA3gU1ZjYZcYW3dwt",
                  ],
                },
                preload: {
                  enabled: true,
                  addresses: [IPFS_PRELOAD_NODE, "/ip4/10.80.63.1/tcp/6744"],
                },
              },
            }),
          ],
        });

        console.log("IPFS API is provided by: " + provider);
        if (provider === "httpClient") {
          console.log("HTTP API address: " + apiAddress);
        }

        setIPFS(ipfs);
      }
    };

    start();
  }, [authState]);

  // Setup Contracts on App Load
  React.useEffect(() => {
    async function contractsSetup() {
      if (sfFramework == null) {
        return;
      }

      const {
        geoWebERC721LicenseContract,
        geoWebAuctionSuperAppContract,
        geoWebFairLaunchClaimerContract,
      } = getContractsForChainOrThrow(
        NETWORK_ID,
        sfFramework.settings.provider
      );
      setLicenseContract(geoWebERC721LicenseContract);
      setAuctionSuperApp(geoWebAuctionSuperAppContract);
      setFairLaunchClaimer(geoWebFairLaunchClaimerContract);
    }
    contractsSetup();
  }, [sfFramework]);

  const Connector = () => {
    if (authState.status !== "connected") {
      return (
        <Button
          variant="outline-primary"
          className="text-light font-weight-bold border-dark"
          style={{ height: "100px" }}
          disabled={authState.status === "connecting"}
          onClick={() => {
            connectWallet();
          }}
        >
          <Image src="vector.png" width="40" style={{ marginRight: 20 }} />
          Connect Wallet
        </Button>
      );
    } else {
      return (
        <Profile
          account={authState.connected.accountID.address}
          disconnectWallet={disconnectWallet}
          paymentToken={paymentToken}
        />
      );
    }
  };

  return (
    <>
      <Container fluid>
        <Navbar
          bg="dark"
          variant="dark"
          fixed="top"
          style={{ height: "100px" }}
          className="border-bottom border-purple"
        >
          <Col sm="3" className="p-0">
            <FAQ />
          </Col>
          <Col sm="6" className="text-center p-2 mx-auto">
            <div
              className="text-primary"
              style={{ fontSize: "2.5em", fontFamily: "Abel" }}
            >
              <Image style={{ height: "1.1em" }} src="logo.png" /> Geo Web
              Cadastre
            </div>
            <div className="text-light" style={{ fontSize: "1em" }}>
              Claim, transfer, and manage digital land
            </div>
          </Col>
          <Col sm="3" className="p-0 text-right">
            <Connector />
          </Col>
        </Navbar>
      </Container>
      <Container fluid>
        {authState.status === "connected" &&
        licenseContract &&
        auctionSuperApp &&
        fairLaunchClaimer &&
        library &&
        paymentToken &&
        ceramic &&
        ipfs &&
        firebasePerf &&
        sfFramework ? (
          <Row>
            <Map
              licenseContract={licenseContract}
              auctionSuperApp={auctionSuperApp}
              claimerContract={fairLaunchClaimer}
              account={authState.connected.accountID.address}
              provider={library}
              ceramic={ceramic}
              ipfs={ipfs}
              firebasePerf={firebasePerf}
              paymentToken={paymentToken}
              sfFramework={sfFramework}
            ></Map>
          </Row>
        ) : (
          <Home />
        )}
      </Container>
    </>
  );
}

export default IndexPage;

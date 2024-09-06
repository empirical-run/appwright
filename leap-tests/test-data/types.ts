export type BaseUserContext = {
  fileNameInCache: string; // Should be unique across user contexts
  wallets: Wallet[];
  onboardingMethod:
    | "import-seed-phrase-12"
    | "import-seed-phrase-24"
    | "import-private-key"
    | "import-ledger";
};

export type UserContextForSeedPhrase = BaseUserContext & {
  phrase: string;
  onboardingMethod: "import-seed-phrase-12" | "import-seed-phrase-24";
  firstOsmosisAddress?: string; // TODO: fit this in wallets
};

export type UserContextForPrivateKey = BaseUserContext & {
  privateKey: string;
  onboardingMethod: "import-private-key";
};

export type UserContextForLedger = BaseUserContext & {
  phrase: string;
  onboardingMethod: "import-ledger";
};

type Wallet = {
  name: string;
  address: string;
  isSelected: boolean;
  fullAddress?: string;
  privateKeys?: PrivateKeys;
};

type PrivateKeys = {
  [key in "cosmosHub" | "injective" | "coreum"]: string;
};

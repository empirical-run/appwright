import {
  UserContextForPrivateKey,
  UserContextForSeedPhrase,
  UserContextForLedger,
} from "./types";

export const TEST_PASSWORD = "t3s!p4ssw0rd";
export const WRONG_PASSWORD = "testpassword";

export const SEED_PHRASE_12_USER: UserContextForSeedPhrase = {
  fileNameInCache: "user-using-seed-phrase-12",
  onboardingMethod: "import-seed-phrase-12",
  phrase:
    "attitude morning priority idle wrong moment quit dinosaur input march sibling minor",
  firstOsmosisAddress: "osmo1k...wez6m",
  wallets: [
    {
      name: "Wallet 1",
      address: "cosmo...jpcp0",
      fullAddress: "cosmos17f9mscvl6z5l28zrgcllgjda7aem9x8eqjpcp0",
      isSelected: false,
      privateKeys: {
        cosmosHub:
          "0xa5ad6c6379ed092688cd3bf43d6fe7003e7f554ed8cb4de2463619b6244bbb1c",
        injective:
          "0x37bbaea866f42160a30d07fc72dcf156b3c72ea332f318d1f6a26306c69f18f2",
        coreum:
          "0x4946116bddc7fd35eaca826bdb1341d1eb708e3bc6f923c4de6c16df97b6e669",
      },
    },
    {
      name: "Wallet 2",
      address: "cosmo...42jvf",
      isSelected: true,
      privateKeys: {
        cosmosHub:
          "0x91c8aaf25e24418a0751d3c9543df7231737061778e462981d8c1602b6e68f3f",
        injective:
          "0xca3c524b7f1cbc6869d19cbde8cdc9a8924528d74b184e5028999cb928bd84c4",
        coreum:
          "0xe6770986133d8a37c6bdab1b91b3b2b0d2387038e558c595d86b33e6460897fd",
      },
    },
    {
      name: "Wallet 3",
      address: "cosmo...xh8my",
      isSelected: true,
    },
    {
      name: "Wallet 4",
      address: "cosmo...r0xfe",
      isSelected: false,
    },
    {
      name: "Wallet 5",
      address: "cosmo...3s2ac",
      isSelected: false,
    },
  ],
};

export const SEED_PHRASE_24_USER: UserContextForSeedPhrase = {
  fileNameInCache: "user-using-seed-phrase-24",
  onboardingMethod: "import-seed-phrase-24",
  phrase:
    "trip churn receive scare issue maple opinion life access climb gold cement wrong garbage history glass view waste midnight symbol bullet twist decide stick",
  firstOsmosisAddress: "osmo1u...9l39v",
  wallets: [
    {
      name: "Wallet 1",
      address: "cosmo...7vpn7",
      isSelected: true,
    },
    {
      name: "Wallet 2",
      address: "cosmo...edkrd",
      isSelected: true,
    },
    {
      name: "Wallet 3",
      address: "cosmo...h3szc",
      isSelected: true,
    },
    {
      name: "Wallet 4",
      address: "cosmo...2eash",
      isSelected: false,
    },
    {
      name: "Wallet 5",
      address: "cosmo...ulv2a",
      isSelected: false,
    },
  ],
};

export const PRIVATE_KEY_SMALL_USER: UserContextForPrivateKey = {
  fileNameInCache: "user-using-small-private-key",
  onboardingMethod: "import-private-key",
  privateKey:
    "0x6647f774f839837a68cb1d53bb6063b991157333cf5c5d12b7c7590d373b0a0a",
  wallets: [],
};

export const SEED_PHRASE_LEDGER: string =
  '"pistol drastic glass bamboo wear hair weather confirm smooth laugh make wide"';

export const LEDGER_USER: UserContextForLedger = {
  fileNameInCache: "user-using-ledger",
  onboardingMethod: "import-ledger",
  phrase: SEED_PHRASE_LEDGER,
  wallets: [
    {
      name: "Wallet 1",
      address: "cosmo...7vpn7", // Not verified
      isSelected: true,
    },
    {
      name: "Wallet 2",
      address: "cosmo...edkrd", // Not verified
      isSelected: true,
    },
    {
      name: "Wallet 3",
      address: "cosmo...h3szc", // Not verified
      isSelected: true,
    },
  ],
};

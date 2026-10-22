import assert from "node:assert/strict";
import test from "node:test";

import { assayLegacyCapitalRecovery, recordLegacyCapitalRecoveryAssay }
  from "../src/legacy-capital-recovery-assay.mjs";

const BASE_BLOCK = "48960870";
const BASE_TIME = "1784711110";
const ARBITRUM_BLOCK = "362235900";
const ARBITRUM_TIME = "1784712217";
const OWNER = "YANAGI";
const FRESH_BASE_BLOCK = "48963088";
const FRESH_BASE_TIME = "1784715523";
const CURRENT_ARBITRUM_BLOCK = "486524579";
const CURRENT_ARBITRUM_TIME = "1784722260";

function token(address, amount, decimals, price, scale, timestamp = BASE_TIME) {
  return {
    token: `eip155:8453/erc20:${address}`,
    amount,
    decimals,
    usdPriceMantissa: price,
    usdPriceScale: scale,
    priceSourceUrl: `https://base.blockscout.com/api/v2/tokens/${address}`,
    priceTimestamp: timestamp,
  };
}

function evidence(overrides = {}) {
  return {
    forkSimulationComplete: true,
    outputVerified: true,
    gasEstimated: true,
    legalAcceptanceRequired: false,
    legalAcceptanceCompleted: false,
    batchOnly: false,
    untrusted: false,
    ...overrides,
  };
}

function economics(gasUnits, feeCeiling, overrides = {}) {
  return {
    gasUnits,
    gasPriceWei: "5000000",
    l1FeeWeiCeiling: "1000000000000",
    executionFeeWeiCeiling: feeCeiling,
    minimumFeeContingencyBps: "11000",
    nativeUsdPriceMantissa: "191948",
    nativeUsdPriceScale: "100",
    nativePriceSourceUrl: "https://base.blockscout.com/api/v2/tokens/0x4200000000000000000000000000000000000006",
    nativePriceTimestamp: BASE_TIME,
    maximumPriceAgeSeconds: "900",
    maximumDragBps: "1000",
    minimumNetMicroUsd: "100000",
    ...overrides,
  };
}

function fixture() {
  return {
    profile: "org.emsenn.agrodao.legacy-capital-recovery-assay.v1",
    authority: { fixedForkEvidenceOnly: true, liveMutation: false, transactionAssembly: false,
      signerMaterialPresent: false, signing: false, broadcast: false },
    candidates: [
      {
        candidateId: "sigmund-mellow-eurc-usdc",
        wallet: "SIGMUND",
        protocol: "Mellow",
        asset: "EURC-USDC wrapper principal and AERO reward",
        chain: { caip2: "eip155:8453", snapshotBlock: BASE_BLOCK, snapshotTimestamp: BASE_TIME },
        evidence: evidence(),
        outputs: [
          token("0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42", "1181741", "6", "114", "100"),
          token("0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", "1280419", "6", "999887", "1000000"),
          token("0x940181a94A35A4569E4529A3CDfB74e38FD98631", "166869887926807403", "18", "43913", "100000"),
        ],
        economics: economics("2282617", "14000000000000"),
        sourceUrls: ["https://base.blockscout.com/address/0x55F54B1f63125Fce3c90F30856CE9d928FF47C26"],
      },
      {
        candidateId: "sigmund-dexfi-main-recovery",
        wallet: "SIGMUND",
        protocol: "DexFi",
        asset: "Vault Token 0x38a280 fixed-fork WETH exit",
        chain: { caip2: "eip155:8453", snapshotBlock: BASE_BLOCK, snapshotTimestamp: BASE_TIME },
        evidence: evidence(),
        outputs: [token("0x4200000000000000000000000000000000000006", "8585002247877349", "18", "191948", "100")],
        economics: economics("4571764", "27000000000000"),
        sourceUrls: ["https://docs.dexfi.com/dexvaults/asset-deposits-withdrawals"],
      },
      {
        candidateId: "sigmund-dexfi-dust",
        wallet: "SIGMUND",
        protocol: "DexFi",
        asset: "Vault Token 0x25ebab fixed-fork WETH exit",
        chain: { caip2: "eip155:8453", snapshotBlock: BASE_BLOCK, snapshotTimestamp: BASE_TIME },
        evidence: evidence(),
        outputs: [token("0x4200000000000000000000000000000000000006", "310212686941", "18", "191948", "100")],
        economics: economics("1785363", "11000000000000"),
        sourceUrls: ["https://docs.dexfi.com/dexvaults/asset-deposits-withdrawals"],
      },
      {
        candidateId: "sigmund-beefy-expired-rewards",
        wallet: "SIGMUND",
        protocol: "Beefy",
        asset: "expired T and mooBIFI rewards",
        chain: { caip2: "eip155:8453", snapshotBlock: BASE_BLOCK, snapshotTimestamp: BASE_TIME },
        evidence: evidence({ batchOnly: true }),
        outputs: [
          token("0x26f3901aC8a79c50fb0d8289C74f0d09AdC42E29", "894250215886059568", "18", "367169", "100000000"),
          token("0xc55E93C62874D8100dBd2DfE307EDc1036ad5434", "53918671777051", "18", "5301", "100"),
        ],
        economics: economics("400000", "4000000000000"),
        sourceUrls: ["https://base.blockscout.com/address/0xCD241A97aC92C3415fEfbe6f3d61A27b2C30acE7"],
      },
      {
        candidateId: "yanagi-gmx-glp-distribution",
        wallet: OWNER,
        protocol: "GMX",
        asset: "GLP incident GLV distribution",
        chain: { caip2: "eip155:42161", snapshotBlock: ARBITRUM_BLOCK, snapshotTimestamp: ARBITRUM_TIME },
        evidence: evidence({ forkSimulationComplete: false, gasEstimated: false,
          legalAcceptanceRequired: true, legalAcceptanceCompleted: false }),
        outputs: [
          { ...token("0xdF03EEd325b82bC1d4Db8b49c30ecc9E05104b96", "3817608593649773717", "18", "1364152990167", "1000000000000", ARBITRUM_TIME),
            token: "eip155:42161/erc20:0xdF03EEd325b82bC1d4Db8b49c30ecc9E05104b96",
            priceSourceUrl: "https://arbitrum-api.gmxinfra.io/prices/tickers" },
          { ...token("0x528A5bac7E746C9A509A1f4F6dF58A03d44279F9", "4149456793756073183", "18", "1160329581433", "1000000000000", ARBITRUM_TIME),
            token: "eip155:42161/erc20:0x528A5bac7E746C9A509A1f4F6dF58A03d44279F9",
            priceSourceUrl: "https://arbitrum-api.gmxinfra.io/prices/tickers" },
        ],
        economics: economics("0", "0", { gasPriceWei: "0", l1FeeWeiCeiling: "0",
          nativeUsdPriceMantissa: "191948", nativeUsdPriceScale: "100",
          nativePriceSourceUrl: "https://arbitrum-api.gmxinfra.io/prices/tickers",
          nativePriceTimestamp: ARBITRUM_TIME }),
        sourceUrls: ["https://gov.gmx.io/t/glp-v1-arbitrum-distribution-plan/4748"],
      },
      {
        candidateId: "yanagi-unsolicited-link-voucher",
        wallet: OWNER,
        protocol: "untrusted",
        asset: "unsolicited LINK voucher ERC1155",
        chain: { caip2: "eip155:42161", snapshotBlock: ARBITRUM_BLOCK, snapshotTimestamp: ARBITRUM_TIME },
        evidence: evidence({ forkSimulationComplete: false, outputVerified: false, gasEstimated: false, untrusted: true }),
        outputs: [],
        economics: economics("0", "0", { gasPriceWei: "0", l1FeeWeiCeiling: "0",
          nativePriceSourceUrl: "https://arbitrum-api.gmxinfra.io/prices/tickers",
          nativePriceTimestamp: ARBITRUM_TIME }),
        sourceUrls: ["https://docs.gmx.io/docs/security"],
      },
    ],
  };
}

function dexfiClusterFixture() {
  const weth = "0x4200000000000000000000000000000000000006";
  const price = "192239139739";
  const scale = "100000000";
  const rows = [
    ["25ebab", "0x25ebab38a83573bcd02a7c58b2e2e9d7ecb0d35e", "1405601", "312281846424", "8830805500000"],
    ["2b6d4b", "0x2b6d4be0c2fe17355022077d735690c66349d9d3", "886425", "800348871547", "5975337500000"],
    ["38a280", "0x38a2809d2493eb7015ce5355a957b741830c4807", "3563800", "8578976208707887", "20700900000000"],
    ["92920e", "0x92920ed9216b6055099eb83c0c75238c053fa57f", "575180", "102479833960651", "4263490000000"],
    ["bef4e1", "0xbef4e15e519d3d8d8437849184cc46f0b646578c", "1016911", "333637344555", "6693010500000"],
    ["d25766", "0xd257667adb0dfeac24d04635f6c064cda2c722e2", "844782", "1118576322758", "5746301000000"],
    ["de7d09", "0xde7d0944406ed67b69441b8942920a03d2f91c20", "566324", "112087110082", "4214782000000"],
    ["eaf27b", "0xeaf27b4a453fddfdec4862d2274ef1aa4ec67555", "562203", "31108467571", "4192116500000"],
    ["f739a2", "0xf739a218adb49940b1a60e5e1f5c4f5a8469858e", "567893", "27378821859", "4223411500000"],
  ];
  return {
    profile: "org.emsenn.agrodao.legacy-capital-recovery-assay.v1",
    authority: { fixedForkEvidenceOnly: true, liveMutation: false, transactionAssembly: false,
      signerMaterialPresent: false, signing: false, broadcast: false },
    candidates: rows.map(([suffix, vault, gasUnits, outputAmount, executionFeeWeiCeiling]) => ({
      candidateId: `sigmund-dexfi-${suffix}`,
      wallet: "SIGMUND",
      protocol: "DexFi",
      asset: `Vault Token ${vault} full-share WETH exit`,
      chain: { caip2: "eip155:8453", snapshotBlock: FRESH_BASE_BLOCK, snapshotTimestamp: FRESH_BASE_TIME },
      evidence: evidence(),
      outputs: [token(weth, outputAmount, "18", price, scale, FRESH_BASE_TIME)],
      economics: economics(gasUnits, executionFeeWeiCeiling, {
        nativeUsdPriceMantissa: price,
        nativeUsdPriceScale: scale,
        nativePriceTimestamp: FRESH_BASE_TIME,
      }),
      sourceUrls: [
        "https://docs.dexfi.com/dexvaults/asset-deposits-withdrawals",
        `https://base.blockscout.com/address/${vault}`,
      ],
    })),
  };
}

function mellowClusterFixture() {
  const priceScale = "1000000000000000000";
  const candidates = [
    {
      candidateId: "sigmund-mellow-eurc-usdc-fresh",
      asset: "EURC-USDC concentrated-liquidity wrapper principal and AERO reward",
      wrapper: "0x55f54b1f63125fce3c90f30856ce9d928ff47c26",
      gasUnits: "1373955",
      executionFeeWeiCeiling: "8656752500000",
      pricePool: "0xE846373C1a92B167b4E9cd5d8E4d6B1Db9E90EC7",
      outputs: [
        ["0x60a3E35Cc302bFA44Cb288Bc5a4F316Fdb1adb42", "1195031", "6", "1140135981306984393"],
        ["0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", "1265260", "6", "999880000000000000"],
        ["0x940181a94A35A4569E4529a3CDfB74e38FD98631", "166884693917621591", "18", "438767321453803852"],
      ],
    },
    {
      candidateId: "sigmund-mellow-weth-kaito",
      asset: "WETH-KAITO concentrated-liquidity wrapper principal and AERO reward",
      wrapper: "0x8e9cb6b9b65efbb75d905c74731045d8115fbc8e",
      gasUnits: "854587",
      executionFeeWeiCeiling: "5800228500000",
      pricePool: "0x56b92E5B391DbFb8b8028AC95A4b97f52ffEB416",
      outputs: [
        ["0x4200000000000000000000000000000000000006", "535573184060904", "18", "1922391397390000000000"],
        ["0x98d0baa52b2D063E780DE12F615f963Fe8537553", "694848315178157725", "18", "938995317523480975"],
        ["0x940181a94A35A4569E4529A3CDfB74e38FD98631", "1874852005045872311", "18", "438767321453803852"],
      ],
    },
    {
      candidateId: "sigmund-mellow-weth-b3",
      asset: "WETH-B3 concentrated-liquidity wrapper principal and AERO reward",
      wrapper: "0xb144e5f83a4320daaa5b90bdef1508376ba498b8",
      gasUnits: "845160",
      executionFeeWeiCeiling: "5748380000000",
      pricePool: "0xB099C658e784b41EE435d48a8eb67e8f27285C93",
      outputs: [
        ["0x4200000000000000000000000000000000000006", "40991494202982", "18", "1922391397390000000000"],
        ["0xB3B32F9f8827D4634fE7d973Fa1034Ec9fdDB3B3", "196849144871752976223", "18", "509292408461812"],
        ["0x940181a94A35A4569E4529A3CDfB74e38FD98631", "761358199949712862", "18", "438767321453803852"],
      ],
    },
  ];
  return {
    profile: "org.emsenn.agrodao.legacy-capital-recovery-assay.v1",
    authority: { fixedForkEvidenceOnly: true, liveMutation: false, transactionAssembly: false,
      signerMaterialPresent: false, signing: false, broadcast: false },
    candidates: candidates.map((candidate) => ({
      candidateId: candidate.candidateId,
      wallet: "SIGMUND",
      protocol: "Mellow",
      asset: candidate.asset,
      chain: { caip2: "eip155:8453", snapshotBlock: FRESH_BASE_BLOCK, snapshotTimestamp: FRESH_BASE_TIME },
      evidence: evidence(),
      outputs: candidate.outputs.map(([address, amount, decimals, price]) => ({
        ...token(address, amount, decimals, price, priceScale, FRESH_BASE_TIME),
        priceSourceUrl: `https://base.blockscout.com/address/${candidate.pricePool}`,
      })),
      economics: economics(candidate.gasUnits, candidate.executionFeeWeiCeiling, {
        nativeUsdPriceMantissa: "1922391397390000000000",
        nativeUsdPriceScale: priceScale,
        nativePriceTimestamp: FRESH_BASE_TIME,
      }),
      sourceUrls: [
        "https://docs.mellow.finance/mellow-alm/overview/mellow-contracts-addresses/aerodrome-cl-strategies",
        `https://base.blockscout.com/address/${candidate.wrapper}`,
        `https://base.blockscout.com/address/${candidate.pricePool}`,
      ],
    })),
  };
}

function yanagiDexfiClusterFixture() {
  const weth = "0x4200000000000000000000000000000000000006";
  const price = "192239139739";
  const scale = "100000000";
  const rows = [
    ["0628a1", "0x0628a1ab3050e889edd20535c34374abd75ef6af", "569730", "10663876889", "4233515000000"],
    ["07b93b", "0x07b93b19e06b8a34e171b861df62b19f50deb4ab", "733524", "11629573474356919", "5134382000000"],
    ["0c1c5f", "0x0c1c5f0266f8417f3c395cdfed0e38ba2e1d563f", "920384", "114505098729532", "6162112000000"],
    ["11c217", "0x11c2173f02c010a0acb9e757d8caef4600b0b30f", "725281", "13321149854352", "5089045500000"],
    ["172937", "0x17293797e96f1f18fa94265e992665267a2b3fc5", "813215", "5330283606760", "5572682500000"],
    ["213ef2", "0x213ef20a160c9e09e5587cccaf1776b3c6ccb621", "665318", "1848494016836", "4759249000000"],
    ["23040a", "0x23040a6455f1387e614cfd35cafa8ad0cd818c11", "1214771", "199913006510", "7781240500000"],
    ["25ebab", "0x25ebab38a83573bcd02a7c58b2e2e9d7ecb0d35e", "1405601", "259100162243", "8830805500000"],
    ["59abed", "0x59abed33a68fce01d72c0e58cef75aab81e71440", "856914", "751430507737802", "5813027000000"],
    ["6e4fb2", "0x6e4fb25efe9316d18b565586addbbab79c6ea459", "789822", "3322484048417", "5444021000000"],
    ["a960f2", "0xa960f20989cc2e7c8564c26a67cf646684b800c5", "984008", "1287812744679840", "6512044000000"],
    ["b54fc3", "0xb54fc320051c555555e78c4330f9043b94861bb5", "970328", "1307105187266186", "6436804000000"],
    ["bef4e1", "0xbef4e15e519d3d8d8437849184cc46f0b646578c", "1016911", "1753820497263", "6693010500000"],
    ["db4cf6", "0xdb4cf623aad8b5ba22f68dbc0d66a68e8e4d92da", "652632", "283289192813", "4689476000000"],
    ["dcf586", "0xdcf586a353f9e5db35a784d853a9ed66b8b048b0", "784301", "150684163495333", "5413655500000"],
    ["e0ad1c", "0xe0ad1cefb93de7f7d852c407b5e1f5d5e7030150", "1414692", "9824932163588", "8880806000000"],
    ["e3d6cb", "0xe3d6cb64f91ca100e41f0997d7a3aa8cc175dc46", "1008191", "669122540288", "6645050500000"],
  ];
  return {
    profile: "org.emsenn.agrodao.legacy-capital-recovery-assay.v1",
    authority: { fixedForkEvidenceOnly: true, liveMutation: false, transactionAssembly: false,
      signerMaterialPresent: false, signing: false, broadcast: false },
    candidates: rows.map(([suffix, vault, gasUnits, outputAmount, executionFeeWeiCeiling]) => ({
      candidateId: `yanagi-dexfi-${suffix}`,
      wallet: "YANAGI",
      protocol: "DexFi",
      asset: `Vault Token ${vault} full-share WETH exit`,
      chain: { caip2: "eip155:8453", snapshotBlock: FRESH_BASE_BLOCK, snapshotTimestamp: FRESH_BASE_TIME },
      evidence: evidence(),
      outputs: [token(weth, outputAmount, "18", price, scale, FRESH_BASE_TIME)],
      economics: economics(gasUnits, executionFeeWeiCeiling, {
        nativeUsdPriceMantissa: price,
        nativeUsdPriceScale: scale,
        nativePriceTimestamp: FRESH_BASE_TIME,
      }),
      sourceUrls: [
        "https://docs.dexfi.com/dexvaults/asset-deposits-withdrawals",
        `https://base.blockscout.com/address/${vault}`,
      ],
    })),
  };
}

function yanagiBeefyClusterFixture() {
  const weth = "0x4200000000000000000000000000000000000006";
  const scale = "1000000000000000000";
  const wethPrice = "1922391397390000000000";
  const output = (address, amount, decimals, price, priceSourceUrl) => ({
    ...token(address, amount, decimals, price, scale, FRESH_BASE_TIME),
    priceSourceUrl,
  });
  const candidate = ({ suffix, asset, vault, gasUnits, fee, outputs }) => ({
    candidateId: `yanagi-beefy-${suffix}`,
    wallet: "YANAGI",
    protocol: "Beefy",
    asset,
    chain: { caip2: "eip155:8453", snapshotBlock: FRESH_BASE_BLOCK, snapshotTimestamp: FRESH_BASE_TIME },
    evidence: evidence(),
    outputs,
    economics: economics(gasUnits, fee, {
      nativeUsdPriceMantissa: wethPrice,
      nativeUsdPriceScale: scale,
      nativePriceTimestamp: FRESH_BASE_TIME,
    }),
    sourceUrls: [
      "https://docs.beefy.finance/developer-documentation/vault-contract",
      "https://api.beefy.finance/vaults",
      `https://base.blockscout.com/address/${vault}`,
    ],
  });
  return {
    profile: "org.emsenn.agrodao.legacy-capital-recovery-assay.v1",
    authority: { fixedForkEvidenceOnly: true, liveMutation: false, transactionAssembly: false,
      signerMaterialPresent: false, signing: false, broadcast: false },
    candidates: [
      candidate({ suffix: "l2ve-aero", asset: "L2VE-AERO vault shares through Aerodrome LP burn",
        vault: "0x24b455e93cc41cbac6cde53f942fb13db8691cbe", gasUnits: "541553", fee: "4078541500000",
        outputs: [
          output("0x940181a94A35A4569E4529A3CDfB74e38FD98631", "31179841488285", "18", "438767321453803852", "https://base.blockscout.com/address/0xfc13b664e814098f08f10ba0fb23b1bb916f344e"),
          output("0xA19328fb05ce6FD204D16c2a2A98F7CF434c12F4", "1288920903179522171", "18", "10614069101852", "https://base.blockscout.com/address/0xfc13b664e814098f08f10ba0fb23b1bb916f344e"),
        ] }),
      candidate({ suffix: "doginme-weth", asset: "doginme-WETH vault shares through Cowcentrated exit",
        vault: "0x3fcda716a72037454a467c67252677756fc2c546", gasUnits: "2030331", fee: "12266820500000",
        outputs: [
          output(weth, "62244889985900", "18", wethPrice, "https://base.blockscout.com/address/0x088c39ee29fc30df8adc394e9f7dea33e3a26507"),
          output("0x6921B130D297cc43754afba22e5EAc0FBf8Db75b", "5630121438190460422569", "18", "65724184543340", "https://base.blockscout.com/address/0x088c39ee29fc30df8adc394e9f7dea33e3a26507"),
        ] }),
      candidate({ suffix: "mseth-weth", asset: "msETH-WETH vault shares through Aerodrome LP burn",
        vault: "0x4187d53fa448dc18da79accd27112ff065216471", gasUnits: "576031", fee: "4268170500000",
        outputs: [
          output(weth, "270331419275226", "18", wethPrice, "https://base.blockscout.com/address/0xde4fb30ccc2f1210fce2c8ad66410c586c8d1f9a"),
          output("0x7Ba6F01772924a82D9626c126347A28299E98c98", "369376814670324", "18", "1406917744208581974447", "https://base.blockscout.com/address/0xde4fb30ccc2f1210fce2c8ad66410c586c8d1f9a"),
        ] }),
      candidate({ suffix: "weeth-weth", asset: "weETH-WETH vault shares through Aerodrome LP burn",
        vault: "0x47579c50c7aedea788d18927aed4c827fe34996a", gasUnits: "544853", fee: "4096691500000",
        outputs: [
          output("0x04C0599Ae5A44757c0af6F9eC3b93da8976c150A", "2661350937434604", "18", "2114836492742665641384", "https://base.blockscout.com/address/0x91f0f34916ca4e2cce120116774b0e4fa0cdcaa8"),
          output(weth, "2927771155303278", "18", wethPrice, "https://base.blockscout.com/address/0x91f0f34916ca4e2cce120116774b0e4fa0cdcaa8"),
        ] }),
      candidate({ suffix: "balancer-weth-reth", asset: "retired Balancer WETH-rETH vault shares to BPT",
        vault: "0x77b3b76a68b89541cbb60d3609988376290cb929", gasUnits: "112850", fee: "1720675000000",
        outputs: [output("0xC771c1a5905420DAEc317b154EB13e4198BA97D0", "5295449146957809645", "18", "1497", "https://base.blockscout.com/address/0xc771c1a5905420daec317b154eb13e4198ba97d0")] }),
      candidate({ suffix: "weth-well", asset: "WETH-WELL vault shares through Aerodrome LP burn",
        vault: "0xacdbb7c90c0f764ca7bb5307d18c5b211fbd9c00", gasUnits: "567855", fee: "4223202500000",
        outputs: [
          output(weth, "14610539335845", "18", wethPrice, "https://base.blockscout.com/address/0x89d0f320ac73dd7d9513ffc5bc58d1161452a657"),
          output("0xa88594D404727625A9437C3f886C7643872296AE", "8102404443720414818", "18", "3466523465417103", "https://base.blockscout.com/address/0x89d0f320ac73dd7d9513ffc5bc58d1161452a657"),
        ] }),
      candidate({ suffix: "usdc-aero", asset: "USDC-AERO vault shares through Aerodrome LP burn",
        vault: "0xc005b9833debcf5fe6cc5bc9ba4fd74bb382ae55", gasUnits: "515526", fee: "3935393000000",
        outputs: [
          output("0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", "300", "6", "999880000000000000", "https://base.blockscout.com/address/0x6cdcb1c4a4d1c3c6d054b27ac5b77e89eafb971d"),
          output("0x940181a94A35A4569E4529A3CDfB74e38FD98631", "684744516243938", "18", "438767321453803852", "https://base.blockscout.com/address/0x6cdcb1c4a4d1c3c6d054b27ac5b77e89eafb971d"),
        ] }),
      candidate({ suffix: "sfrxeth-wsteth", asset: "sfrxETH-wstETH vault shares through Aerodrome LP burn",
        vault: "0xdee327bf6b0182a1727caec9c6344a0d27d6da99", gasUnits: "496306", fee: "3829683000000",
        outputs: [
          output("0x1f55a02A049033E3419a8E2975cF3F572F4e6E9A", "1566987066464396", "18", wethPrice, "https://base.blockscout.com/address/0x456c166e63634d75a4b49edec86cb51424d4c926"),
          output("0xc1CBa3fCea344f92D9239c08C0568f6F2F0ee452", "1408945011680903", "18", wethPrice, "https://base.blockscout.com/address/0x456c166e63634d75a4b49edec86cb51424d4c926"),
        ] }),
      candidate({ suffix: "reward-weth-qi", asset: "reward pool and WETH-QI vault through Aerodrome LP burn",
        vault: "0x50b4728983475f6f30d8e8bfcf63bbfa8433eed9", gasUnits: "669047", fee: "4779758500000",
        outputs: [
          output(weth, "244602653714747", "18", wethPrice, "https://base.blockscout.com/address/0x06709c364dd4e2f5b0c10b1ebf80b2ce483dbdc5"),
          output("0xD3FDCb837DAfdb7C9C3eBD48FE22a53F6Dd3d7D7", "94280641739406673788", "18", "4987471750348248", "https://base.blockscout.com/address/0x06709c364dd4e2f5b0c10b1ebf80b2ce483dbdc5"),
          output("0xc55E93C62874D8100dBd2DfE307EDc1036ad5434", "274927597140648", "18", "53010000000000000000", "https://base.blockscout.com/address/0xc55e93c62874d8100dbd2dfe307edc1036ad5434"),
        ] }),
      candidate({ suffix: "reward-virtual-weth", asset: "reward pool and VIRTUAL-WETH Cowcentrated exit",
        vault: "0x594b8cbe6ce291547b0af385486b59c435e8707f", gasUnits: "667500", fee: "4771250000000",
        outputs: [
          output("0x0b3e328455c4059EEb9e3f84b5543F74E24e7E1b", "3363808715466149829", "18", "653435930874860309", "https://base.blockscout.com/address/0x9c087eb773291e50cf6c6a90ef0f4500e349b903"),
          output(weth, "1128351682283328", "18", wethPrice, "https://base.blockscout.com/address/0x9c087eb773291e50cf6c6a90ef0f4500e349b903"),
          output("0xc55E93C62874D8100dBd2DfE307EDc1036ad5434", "12196192254923", "18", "53010000000000000000", "https://base.blockscout.com/address/0xc55e93c62874d8100dbd2dfe307edc1036ad5434"),
        ] }),
      candidate({ suffix: "reward-tbtc-cbbtc", asset: "reward pool and tBTC-cbBTC vault through Aerodrome LP burn",
        vault: "0xcd241a97ac92c3415fefbe6f3d61a27b2c30ace7", gasUnits: "768134", fee: "5324737000000",
        outputs: [
          output("0x236aa50979D5f3De3Bd1Eeb40E81137F22ab794b", "12070390588354", "18", "65902631425170000000000", "https://base.blockscout.com/address/0x488d6ea6064eee9352fdcdb7bc50d98a7ff3ad4e"),
          output("0xcbb7C0000aB88B473b1f5AFd9ef808440EED33bF", "1054", "8", "65902631425170000000000", "https://base.blockscout.com/address/0x488d6ea6064eee9352fdcdb7bc50d98a7ff3ad4e"),
          output("0x26f3901aC8a79c50fb0d8289C74f0d09AdC42E29", "179820709151399353", "18", "3671690000000000", "https://base.blockscout.com/address/0x26f3901ac8a79c50fb0d8289c74f0d09adc42e29"),
          output("0xc55E93C62874D8100dBd2DfE307EDc1036ad5434", "10842260502944", "18", "53010000000000000000", "https://base.blockscout.com/address/0xc55e93c62874d8100dbd2dfe307edc1036ad5434"),
        ] }),
    ],
  };
}

function yanagiRemainingRecoveryFixture() {
  const authority = { fixedForkEvidenceOnly: true, liveMutation: false, transactionAssembly: false,
    signerMaterialPresent: false, signing: false, broadcast: false };
  const arbToken = (address, amount, decimals, price, scale, priceSourceUrl) => ({
    token: `eip155:42161/erc20:${address}`,
    amount,
    decimals,
    usdPriceMantissa: price,
    usdPriceScale: scale,
    priceSourceUrl,
    priceTimestamp: CURRENT_ARBITRUM_TIME,
  });
  const arbEconomics = (gasUnits, executionFeeWeiCeiling) => ({
    gasUnits,
    gasPriceWei: "17592752",
    l1FeeWeiCeiling: "0",
    executionFeeWeiCeiling,
    minimumFeeContingencyBps: "11000",
    nativeUsdPriceMantissa: "192349",
    nativeUsdPriceScale: "100",
    nativePriceSourceUrl: "https://arbitrum-api.gmxinfra.io/prices/candles?tokenSymbol=ETH&period=1m&limit=20",
    nativePriceTimestamp: CURRENT_ARBITRUM_TIME,
    maximumPriceAgeSeconds: "900",
    maximumDragBps: "1000",
    minimumNetMicroUsd: "100000",
  });
  return {
    profile: "org.emsenn.agrodao.legacy-capital-recovery-assay.v1",
    authority,
    candidates: [
      {
        candidateId: "yanagi-uniswap-v2-grokvance-weth",
        wallet: "YANAGI",
        protocol: "Uniswap V2",
        asset: "GROKVANCE-WETH LP receipt",
        chain: { caip2: "eip155:8453", snapshotBlock: "48957274", snapshotTimestamp: FRESH_BASE_TIME },
        evidence: evidence(),
        outputs: [
          token("0x405B5Fa57bB05C5Cd90a528cE9815857e8b99490", "19583969003256945875", "18", "2965", "100000000000", FRESH_BASE_TIME),
          token("0x4200000000000000000000000000000000000006", "302040243", "18", "1922391397390000000000", "1000000000000000000", FRESH_BASE_TIME),
        ],
        economics: economics("187531", "1100000000000", {
          l1FeeWeiCeiling: "0",
          nativeUsdPriceMantissa: "1922391397390000000000",
          nativeUsdPriceScale: "1000000000000000000",
          nativePriceTimestamp: FRESH_BASE_TIME,
        }),
        sourceUrls: [
          "https://base.blockscout.com/address/0x1e27aa88772a391ee4928bfc251fe60a45d4f8eb",
        ],
      },
      {
        candidateId: "yanagi-gmx-v1-fsglp-residual",
        wallet: "YANAGI",
        protocol: "GMX",
        asset: "V1 fsGLP residual redeemed through the GLP reward router",
        chain: { caip2: "eip155:42161", snapshotBlock: CURRENT_ARBITRUM_BLOCK,
          snapshotTimestamp: CURRENT_ARBITRUM_TIME },
        evidence: evidence(),
        outputs: [arbToken("0x2f2a2543B76A4166549F7aaB2e75Bef0aefC5B0f", "1181", "8", "658501", "10",
          "https://arbitrum-api.gmxinfra.io/prices/candles?tokenSymbol=BTC&period=1m&limit=20")],
        economics: arbEconomics("1012114", "20000000000000"),
        sourceUrls: [
          "https://docs.gmx.io/docs/archived/liquidity-v1/",
          "https://github.com/gmx-io/gmx-interface/blob/master/sdk/src/configs/contracts.ts",
        ],
      },
      {
        candidateId: "yanagi-turntide-dao-native-treasury",
        wallet: "YANAGI",
        protocol: "Aragon OSx",
        asset: "Turntide Islands DAO native treasury wrapped and transferred by sole-member proposal",
        chain: { caip2: "eip155:42161", snapshotBlock: CURRENT_ARBITRUM_BLOCK,
          snapshotTimestamp: CURRENT_ARBITRUM_TIME },
        evidence: evidence(),
        outputs: [arbToken("0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", "4000000000000000", "18", "192349", "100",
          "https://arbitrum-api.gmxinfra.io/prices/candles?tokenSymbol=ETH&period=1m&limit=20")],
        economics: arbEconomics("494060", "10000000000000"),
        sourceUrls: [
          "https://arbitrum.blockscout.com/address/0x3a56913f6CFd88f630d48ec70ffCc32b84E9662f",
          "https://arbitrum.blockscout.com/address/0xC45e36296714440a012A7191d97eA1E9eccf7C91",
        ],
      },
      {
        candidateId: "yanagi-gmx-v1-fee-reward",
        wallet: "YANAGI",
        protocol: "GMX",
        asset: "Accrued V1 fsGLP fee reward claimed as WETH",
        chain: { caip2: "eip155:42161", snapshotBlock: CURRENT_ARBITRUM_BLOCK,
          snapshotTimestamp: CURRENT_ARBITRUM_TIME },
        evidence: evidence(),
        outputs: [arbToken("0x82aF49447D8a07e3bd95BD0d56f35241523fBab1", "177172561910055", "18", "192349", "100",
          "https://arbitrum-api.gmxinfra.io/prices/candles?tokenSymbol=ETH&period=1m&limit=20")],
        economics: arbEconomics("152450", "3000000000000"),
        sourceUrls: [
          "https://github.com/gmx-io/gmx-contracts/blob/master/contracts/staking/RewardRouterV2.sol",
          "https://github.com/gmx-io/gmx-interface/blob/master/sdk/src/configs/contracts.ts",
        ],
      },
    ],
  };
}

function assertNoNumericValues(value) {
  assert.notEqual(typeof value, "number");
  assert.notEqual(typeof value, "bigint");
  if (Array.isArray(value)) value.forEach(assertNoNumericValues);
  else if (value != null && typeof value === "object") Object.values(value).forEach(assertNoNumericValues);
}

test("classifies recovery, dust, batching, legal acceptance, and untrusted assets", () => {
  const result = assayLegacyCapitalRecovery(fixture());
  const dispositions = Object.fromEntries(result.candidates.map((candidate) => [candidate.candidateId, candidate.disposition]));
  assert.equal(dispositions["sigmund-mellow-eurc-usdc"], "recover-now");
  assert.equal(dispositions["sigmund-dexfi-main-recovery"], "recover-now");
  assert.equal(dispositions["sigmund-dexfi-dust"], "leave-dust");
  assert.equal(dispositions["sigmund-beefy-expired-rewards"], "batch-only");
  assert.equal(dispositions["yanagi-gmx-glp-distribution"], "legal-acceptance-blocked");
  assert.equal(dispositions["yanagi-unsolicited-link-voucher"], "ignore-untrusted");
  assert.equal(result.dispositionCounts["recover-now"], "2");
  assert.equal(result.gate.executionAdmitted, false);
  assert.match(result.id, /^ni:\/\/\/sha-256;[A-Za-z0-9_-]{43}$/u);
  assertNoNumericValues(result);
});

test("uses conservative floors for output and ceilings for fees", () => {
  const result = assayLegacyCapitalRecovery(fixture());
  const mellow = result.candidates.find((candidate) => candidate.candidateId === "sigmund-mellow-eurc-usdc");
  assert.equal(mellow.value.grossMicroUsdFloor, "2700735");
  assert.equal(mellow.value.executionFeeMicroUsdCeil, "26873");
  assert.equal(mellow.value.netMicroUsdAfterFeeCeiling, "2673862");
});

test("fresh fixed fork recovers only the two economic DexFi vault exits", () => {
  const result = assayLegacyCapitalRecovery(dexfiClusterFixture());
  const dispositions = Object.fromEntries(result.candidates.map((candidate) => [candidate.candidateId, candidate.disposition]));
  assert.equal(dispositions["sigmund-dexfi-38a280"], "recover-now");
  assert.equal(dispositions["sigmund-dexfi-92920e"], "recover-now");
  for (const suffix of ["25ebab", "2b6d4b", "bef4e1", "d25766", "de7d09", "eaf27b", "f739a2"]) {
    assert.equal(dispositions[`sigmund-dexfi-${suffix}`], "leave-dust");
  }
  assert.equal(result.dispositionCounts["recover-now"], "2");
  assert.equal(result.dispositionCounts["leave-dust"], "7");
  const main = result.candidates.find((candidate) => candidate.candidateId === "sigmund-dexfi-38a280");
  assert.equal(main.value.grossMicroUsdFloor, "16492150");
  assert.equal(main.value.executionFeeMicroUsdCeil, "39796");
  assert.equal(main.value.netMicroUsdAfterFeeCeiling, "16452354");
  const secondary = result.candidates.find((candidate) => candidate.candidateId === "sigmund-dexfi-92920e");
  assert.equal(secondary.value.netMicroUsdAfterFeeCeiling, "188809");
  assert.equal(result.gate.executionAdmitted, false);
});

test("fresh fixed fork admits all three Mellow wrapper exits", () => {
  const result = assayLegacyCapitalRecovery(mellowClusterFixture());
  assert.equal(result.dispositionCounts["recover-now"], "3");
  assert.equal(result.candidates.every((candidate) => candidate.disposition === "recover-now"), true);
  const net = Object.fromEntries(result.candidates.map((candidate) => [candidate.candidateId,
    candidate.value.netMicroUsdAfterFeeCeiling]));
  assert.deepEqual(net, {
    "sigmund-mellow-eurc-usdc-fresh": "2684186",
    "sigmund-mellow-weth-kaito": "2493512",
    "sigmund-mellow-weth-b3": "502062",
  });
  assert.equal(result.gate.executionAdmitted, false);
});

test("fresh fixed fork recovers six Yanagi DexFi vaults and leaves eleven dust positions", () => {
  const result = assayLegacyCapitalRecovery(yanagiDexfiClusterFixture());
  const dispositions = Object.fromEntries(result.candidates.map((candidate) => [candidate.candidateId, candidate.disposition]));
  for (const suffix of ["07b93b", "0c1c5f", "59abed", "a960f2", "b54fc3", "dcf586"]) {
    assert.equal(dispositions[`yanagi-dexfi-${suffix}`], "recover-now");
  }
  for (const suffix of ["0628a1", "11c217", "172937", "213ef2", "23040a", "25ebab", "6e4fb2",
    "bef4e1", "db4cf6", "e0ad1c", "e3d6cb"]) {
    assert.equal(dispositions[`yanagi-dexfi-${suffix}`], "leave-dust");
  }
  assert.equal(result.dispositionCounts["recover-now"], "6");
  assert.equal(result.dispositionCounts["leave-dust"], "11");
  const recoverable = result.candidates.filter((candidate) => candidate.disposition === "recover-now");
  assert.equal(recoverable.reduce((sum, candidate) => sum + BigInt(candidate.value.netMicroUsdAfterFeeCeiling), 0n), 29231184n);
  assert.equal(result.gate.executionAdmitted, false);
});

test("fresh fixed fork recovers seven Yanagi Beefy routes and leaves four dust positions", () => {
  const result = assayLegacyCapitalRecovery(yanagiBeefyClusterFixture());
  const dispositions = Object.fromEntries(result.candidates.map((candidate) => [candidate.candidateId, candidate.disposition]));
  for (const suffix of ["doginme-weth", "mseth-weth", "weeth-weth", "sfrxeth-wsteth", "reward-weth-qi",
    "reward-virtual-weth", "reward-tbtc-cbbtc"]) {
    assert.equal(dispositions[`yanagi-beefy-${suffix}`], "recover-now");
  }
  for (const suffix of ["l2ve-aero", "balancer-weth-reth", "weth-well", "usdc-aero"]) {
    assert.equal(dispositions[`yanagi-beefy-${suffix}`], "leave-dust");
  }
  assert.equal(result.dispositionCounts["recover-now"], "7");
  assert.equal(result.dispositionCounts["leave-dust"], "4");
  const recoverable = result.candidates.filter((candidate) => candidate.disposition === "recover-now");
  assert.equal(recoverable.reduce((sum, candidate) => sum + BigInt(candidate.value.netMicroUsdAfterFeeCeiling), 0n), 25245127n);
  assert.equal(result.gate.executionAdmitted, false);
});

test("fixed forks recover Yanagi fsGLP, fee rewards, and DAO treasury while leaving the GROKVANCE LP dust", () => {
  const result = assayLegacyCapitalRecovery(yanagiRemainingRecoveryFixture());
  const dispositions = Object.fromEntries(result.candidates.map(({ candidateId, disposition }) => [candidateId, disposition]));
  assert.equal(dispositions["yanagi-uniswap-v2-grokvance-weth"], "leave-dust");
  assert.equal(dispositions["yanagi-gmx-v1-fsglp-residual"], "recover-now");
  assert.equal(dispositions["yanagi-turntide-dao-native-treasury"], "recover-now");
  assert.equal(dispositions["yanagi-gmx-v1-fee-reward"], "recover-now");
  assert.equal(result.dispositionCounts["recover-now"], "3");
  assert.equal(result.dispositionCounts["leave-dust"], "1");
  assert.equal(result.gate.executionAdmitted, false);
});

test("identity is deterministic across candidate object key order", () => {
  const first = fixture();
  const second = fixture();
  second.candidates = second.candidates.map((candidate) => Object.fromEntries(Object.entries(candidate).reverse()));
  assert.equal(assayLegacyCapitalRecovery(first).id, assayLegacyCapitalRecovery(second).id);
});

test("refuses an execution fee ceiling below modeled gas and L1 fee", () => {
  const input = fixture();
  input.candidates[0].economics.executionFeeWeiCeiling = "1";
  assert.throws(() => assayLegacyCapitalRecovery(input), /below contingent modeled L2 gas plus L1 fee/u);
});

test("refuses cross-chain, duplicate, stale, and future output prices", () => {
  const crossChain = fixture();
  crossChain.candidates[0].outputs[0].token = crossChain.candidates[0].outputs[0].token.replace("eip155:8453", "eip155:42161");
  assert.throws(() => assayLegacyCapitalRecovery(crossChain), /candidate chain/u);
  const duplicate = fixture(); duplicate.candidates[0].outputs[1].token = duplicate.candidates[0].outputs[0].token;
  assert.throws(() => assayLegacyCapitalRecovery(duplicate), /unique token identifiers/u);
  const stale = fixture(); stale.candidates[0].outputs[0].priceTimestamp = "1784700000";
  assert.throws(() => assayLegacyCapitalRecovery(stale), /declared maximum age/u);
  const future = fixture(); future.candidates[0].economics.nativePriceTimestamp = "1784711111";
  assert.throws(() => assayLegacyCapitalRecovery(future), /non-future/u);
});

test("refuses live authority, numeric values, and transaction material", () => {
  const live = fixture(); live.authority.broadcast = true;
  assert.throws(() => assayLegacyCapitalRecovery(live), /no live mutation/u);
  const numeric = fixture(); numeric.candidates[0].economics.gasUnits = 2282617;
  assert.throws(() => assayLegacyCapitalRecovery(numeric), /decimal string/u);
  const transaction = fixture(); transaction.candidates[0].calldata = "0xdeadbeef";
  assert.throws(() => assayLegacyCapitalRecovery(transaction), /transaction or secret material/u);
});

test("records accepted recovery evidence only through AGRODAO's settlement-store boundary", async () => {
  const writes = [];
  const store = { actor: "urn:ame:agrodao", async record(value) { writes.push(value); return { digest: "ni:///sha-256;AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA" }; } };
  const recorded = await recordLegacyCapitalRecoveryAssay(dexfiClusterFixture(), {
    recordedAt: "2026-07-22T11:15:00.000Z", store,
  });
  assert.equal(writes.length, 1);
  assert.equal(writes[0].category, "agrodao.legacy-capital-recovery-assay");
  assert.equal(writes[0].record.assay.id, recorded.result.id);
  assert.equal(writes[0].record.decisionBoundary.executionAdmitted, false);
  assert.equal(writes[0].record.decisionBoundary.signing, false);
  await assert.rejects(() => recordLegacyCapitalRecoveryAssay(dexfiClusterFixture(), {
    recordedAt: "not-a-time", store,
  }), /ISO timestamp/u);
  await assert.rejects(() => recordLegacyCapitalRecoveryAssay(dexfiClusterFixture(), {
    recordedAt: "2026-07-22T11:15:00.000Z", store: { ...store, actor: "urn:ame:not-agrodao" },
  }), /AGRODAO's contracted settlement store/u);
});

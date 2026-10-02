// Minimal ABIs — event signatures only, enough for the indexer and typed reads.
// Regenerate from packages/contracts build output once contracts are compiled;
// do not hand-edit these once that pipeline exists (brief section 16, work package 3).

export const lockManagerAbi = [
  {
    type: "event",
    name: "LockCreated",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "token", type: "address", indexed: true },
      { name: "creator", type: "address", indexed: true },
      { name: "beneficiary", type: "address", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
      { name: "createdAt", type: "uint64", indexed: false },
      { name: "unlockTime", type: "uint64", indexed: false },
    ],
  },
  {
    type: "event",
    name: "LockWithdrawn",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "beneficiary", type: "address", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
    ],
  },
  {
    type: "function",
    name: "getLock",
    stateMutability: "view",
    inputs: [{ name: "positionId", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "token", type: "address" },
          { name: "creator", type: "address" },
          { name: "beneficiary", type: "address" },
          { name: "amount", type: "uint256" },
          { name: "createdAt", type: "uint64" },
          { name: "unlockTime", type: "uint64" },
          { name: "withdrawn", type: "bool" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "createLock",
    stateMutability: "payable",
    inputs: [
      { name: "token", type: "address" },
      { name: "beneficiary", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "unlockTime", type: "uint64" },
    ],
    outputs: [{ name: "positionId", type: "uint256" }],
  },
  {
    type: "function",
    name: "lockFee",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "withdraw",
    stateMutability: "nonpayable",
    inputs: [{ name: "positionId", type: "uint256" }],
    outputs: [],
  },
] as const;

export const vestingManagerAbi = [
  {
    type: "event",
    name: "VestingCreated",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "token", type: "address", indexed: true },
      { name: "creator", type: "address", indexed: true },
      { name: "beneficiary", type: "address", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
      { name: "startTime", type: "uint64", indexed: false },
      { name: "cliffTime", type: "uint64", indexed: false },
      { name: "endTime", type: "uint64", indexed: false },
      { name: "createdAt", type: "uint64", indexed: false },
    ],
  },
  {
    type: "event",
    name: "VestingClaimed",
    inputs: [
      { name: "id", type: "uint256", indexed: true },
      { name: "beneficiary", type: "address", indexed: false },
      { name: "amount", type: "uint256", indexed: false },
      { name: "cumulativeClaimed", type: "uint256", indexed: false },
    ],
  },
  {
    type: "function",
    name: "getVesting",
    stateMutability: "view",
    inputs: [{ name: "positionId", type: "uint256" }],
    outputs: [
      {
        type: "tuple",
        components: [
          { name: "token", type: "address" },
          { name: "creator", type: "address" },
          { name: "beneficiary", type: "address" },
          { name: "totalAmount", type: "uint256" },
          { name: "claimedAmount", type: "uint256" },
          { name: "createdAt", type: "uint64" },
          { name: "startTime", type: "uint64" },
          { name: "cliffTime", type: "uint64" },
          { name: "endTime", type: "uint64" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "createVesting",
    stateMutability: "nonpayable",
    inputs: [
      { name: "token", type: "address" },
      { name: "beneficiary", type: "address" },
      { name: "amount", type: "uint256" },
      { name: "startTime", type: "uint64" },
      { name: "cliffTime", type: "uint64" },
      { name: "endTime", type: "uint64" },
    ],
    outputs: [{ name: "positionId", type: "uint256" }],
  },
  {
    type: "function",
    name: "claim",
    stateMutability: "nonpayable",
    inputs: [{ name: "positionId", type: "uint256" }],
    outputs: [{ name: "amount", type: "uint256" }],
  },
] as const;

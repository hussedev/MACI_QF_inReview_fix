import { Signer, ethers } from "ethers";
import { Allo, MACIQF } from "../../typechain-types";

import { getRecipientClaimData } from "./maci";
import { JSONFile } from "./JSONFile";
import { getTalyFilePath } from "./misc";

export const distribute = async ({
  outputDir,
  AlloContract,
  MACIQFStrategy,
  distributor,
  recipientTreeDepth,
  recipients,
}: {
  outputDir: string;
  AlloContract: Allo;
  MACIQFStrategy: MACIQF;
  distributor: Signer;
  recipientTreeDepth: any;
  recipients: Signer[];
}) => {
  const tallyFile = getTalyFilePath(outputDir);

  const tally = JSONFile.read(tallyFile) as any;

  const AbiCoder = new ethers.AbiCoder();

  const bytesArray: string[] = [];

  const provider = distributor.provider!;

  const pollId = 1;

  const recipientsBalances: {
    [key: string]: {
      before: bigint;
      after: bigint;
      diff: bigint;
    };
  } = {};
  const poolAmountBeforeDistribution = await provider.getBalance(
    await MACIQFStrategy.getAddress()
  );

  // First pass to gather all required data
  for (const recipient of recipients) {
    const recipientAddress = await recipient.getAddress();
    const recipientIndex = await MACIQFStrategy.recipientToVoteIndex(
      recipientAddress
    );

    recipientsBalances[recipientAddress] = {
      before: await provider.getBalance(recipientAddress),
      after: 0n, // Initialize with 0
      diff: 0n,
    };

    const distributeData = getRecipientClaimData(
      Number(recipientIndex),
      recipientTreeDepth,
      tally
    );

    const types = ["(uint256,uint256,uint256[][],uint256,uint256,uint256)"];
    const initStruct = [distributeData];
    const bytes = AbiCoder.encode(types, initStruct);
    bytesArray.push(bytes);
  }

  const bytesArrayTypes = ["bytes[]"];
  const bytesArrayEncoded = AbiCoder.encode(bytesArrayTypes, [bytesArray]);

  const distributeFunds = await AlloContract.connect(distributor).distribute(
    pollId,
    [],
    bytesArrayEncoded
  );
  await distributeFunds.wait();

  let totalAmounts: bigint = 0n;
  // Second pass to update the balances after distribution
  for (const recipient of recipients) {
    const recipientAddress = await recipient.getAddress();
    recipientsBalances[recipientAddress].after = await provider.getBalance(
      recipientAddress
    );
    recipientsBalances[recipientAddress].diff =
      recipientsBalances[recipientAddress].after -
      recipientsBalances[recipientAddress].before;
    totalAmounts += BigInt(recipientsBalances[recipientAddress].diff);
  }
  console.log("totalAmounts", totalAmounts);
  console.log("pool balance after", await MACIQFStrategy.getPoolAmount());
  return {
    recipientsBalances: recipientsBalances,
    poolAmountBeforeDistribution: poolAmountBeforeDistribution,
    poolAmountAfterDistribution: await provider.getBalance(
      await MACIQFStrategy.getAddress()
    ),
  };
};
import React, { useState, useEffect } from "react";
import { CartProject } from "../../api/types";
import DefaultLogoImage from "../../../assets/default_logo.png";
import { Link } from "react-router-dom";
import { EyeIcon } from "@heroicons/react/24/solid";
import { TrashIcon } from "@heroicons/react/24/outline";
import { renderToPlainText, VotingToken } from "common";
import { useCartStorage } from "../../../store";
import { Box, Flex, Image, Text, Input, Center } from "@chakra-ui/react";
import { groupProjectsInCart } from "../../api/utils";

export function ProjectInCart(
  props: React.ComponentProps<"div"> & {
    project: CartProject;
    index: number;
    projects: CartProject[];
    roundRoutePath: string;
    last?: boolean;
    selectedPayoutToken: VotingToken;
    payoutTokenPrice: number;
    totalAmount: number;
    removeProjectFromCart: (
      project: CartProject,
      walletAddress: string
    ) => void;
    walletAddress: string;
    alreadyContributed: boolean;
  }
) {
  const {
    project,
    index,
    projects,
    roundRoutePath,
    totalAmount,
    removeProjectFromCart,
  } = props;

  const store = useCartStorage();

  const groupedProjects = groupProjectsInCart(projects);
  const roundProjects = groupedProjects[project.chainId][project.roundId];

  const [votes, setVotes] = useState<string>(
    totalAmount === 0
      ? "0"
      : Number(
          project.amount === "" ? "0" : Math.sqrt(Number(project.amount))
        ).toString()
  );

  const handleVotesChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVotes = e.target.value === "" ? "0" : e.target.value;

    updateProjectAmount(index, parseInt(newVotes));
  };

  const updateProjectAmount = (currentIndex: number, votes: number) => {
    const voiceCredits = votes ** 2;
    const newAmount = voiceCredits;

    // find the total amount of all projects in the round except the current project
    const totalAmountOfOtherProjects = roundProjects
      .filter((_, i) => i !== currentIndex)
      .reduce((acc, project) => acc + Number(project.amount), 0);
    if (totalAmountOfOtherProjects + newAmount > totalAmount * 1e5) {
      store.updateUserDonationAmount(
        project.chainId,
        project.roundId,
        project.grantApplicationId,
        project.amount,
        props.walletAddress
      );
      return;
    }

    store.updateUserDonationAmount(
      project.chainId,
      project.roundId,
      project.grantApplicationId,
      newAmount.toString(),
      props.walletAddress
    );
    setVotes(votes.toString());
  };
  // function printPerfectSquaresWithMapping(n: number): void {
  //   const results: string[] = [];

  //   for (let i = 1; i <= n; i++) {
  //     const square = i * i;
  //     const mappedValue = (square / 1e5) * props.payoutTokenPrice;
  //     results.push(`Square of ${i} is ${square}, mapped value: ${mappedValue}`);
  //   }

  //   console.log(results.join("\n"));
  // }
  useEffect(() => {
    if (totalAmount === 0 || isNaN(Number(votes))) {
      store.updateUserDonationAmount(
        project.chainId,
        project.roundId,
        project.grantApplicationId,
        "0",
        props.walletAddress
      );
      setVotes("0");

      return;
    }
    setVotes(votes);
    // printPerfectSquaresWithMapping(10);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.amount, votes, totalAmount]);

  return (
    <div
      className="mb-4 p-4 border border-gray-200 rounded-md"
      data-testid="cart-project"
    >
      <div className="flex justify-between items-center">
        <div className="flex">
          <div className="relative w-16 h-16 overflow-hidden rounded-full">
            <img
              className="w-16 h-16 rounded-full"
              src={
                project.projectMetadata?.logoImg
                  ? `https://${process.env.REACT_APP_PINATA_GATEWAY}/ipfs/${project.projectMetadata?.logoImg}`
                  : DefaultLogoImage
              }
              alt="Project Logo"
            />
            <Link to={`${roundRoutePath}/${project.grantApplicationId}`}>
              <div className="absolute inset-0 flex justify-center items-center bg-gray-500 opacity-0 hover:opacity-70 transition-opacity duration-300 rounded-full">
                <EyeIcon
                  className="fill-gray-200 w-6 h-6 cursor-pointer"
                  data-testid={`${project.projectRegistryId}-project-link`}
                />
              </div>
            </Link>
          </div>
          <div className="pl-6">
            <Link
              to={`${roundRoutePath}/${project.grantApplicationId}`}
              data-testid="cart-project-link"
            >
              <h2 className="font-semibold text-lg mb-2 truncate max-w-[400px]">
                {project.projectMetadata?.title}
              </h2>
            </Link>
            <p className="text-sm truncate max-w-[400px]">
              {renderToPlainText(
                project.projectMetadata?.description ?? ""
              ).substring(0, 130)}
            </p>
          </div>
        </div>
        <div className="flex flex-col items-center">
          <input
            aria-label={`Donation votes for project ${project.projectMetadata?.title}`}
            value={votes}
            onChange={handleVotesChange}
            className="rounded-xl w-20 text-center"
            min={0}
            type="number"
          />
          <p className="text-gray-400">quadratic votes</p>
        </div>
        <div className="flex flex-col items-center">
          <p className="text-sm text-gray-400">{Number(votes) ** 2}</p>
          <p className="text-gray-400">voice credits</p>
        </div>
        <TrashIcon
          data-testid="remove-from-cart"
          onClick={() => removeProjectFromCart(project, props.walletAddress)}
          className="w-5 h-5 ml-2 cursor-pointer"
        />
      </div>
      {!props.last && <hr className="border-gray-100 mt-4" />}
    </div>
  );
}

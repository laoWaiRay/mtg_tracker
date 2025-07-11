"use client";
import styles from "./styles.module.css";
import { useAuth } from "@/hooks/useAuth";
import StatCard from "@/components/StatCard";
import { GameLogCard } from "@/components/GameLogCard";
import ButtonPrimary from "@/components/ButtonPrimary";
import PieChart from "@/components/PieChart";
import LineChart from "@/components/LineChart";
import {
	DashboardLayout,
	DashboardHeader,
	DashboardMain,
} from "@/components/Dashboard";
import { useGame } from "@/hooks/useGame";
import { useRouter } from "next/navigation";
import { useStatSnapshot } from "@/hooks/useStatSnapshot";
import { useMemo, useState } from "react";
import dayjs from "dayjs";
import DropdownMenu from "@/components/DropdownMenu";
import DeckCard from "@/components/DeckCard";
import { defaultStatSnapshot } from "@/hooks/useStatSnapshot";
import LoadingSpinner from "@/components/LoadingSpinner";
import ButtonLink from "@/components/ButtonLink";
import { useDeck } from "@/hooks/useDeck";

interface StatCardData {
	title: string;
	data: string | number;
	subData: (string | number)[];
	styles?: { main: string; sub: string };
}

const statCardNumberStyles = {
	main: "text-2xl text-fg-light my-2 flex",
	sub: "text-fg-dark",
};

const statCardTextStyles = {
	main: "text-lg text-fg-light my-2",
	sub: "text-fg-dark",
};

export type TimePeriod = "AllTime" | "CurrentYear" | "CurrentMonth";
const timePeriodLabels: string[] = ["All", "Year", "Month"];
const labelToTimePeriod: Record<string, TimePeriod> = {
	All: "AllTime",
	Year: "CurrentYear",
	Month: "CurrentMonth",
};

export const podSizeLabels: string[] = ["All", "2", "3", "4", "5+"];
export const labelToPodSize: Record<string, number> = {
	All: 0,
	"2": 2,
	"3": 3,
	"4": 4,
	"5+": 5,
};

export default function CommandZone() {
	const { user } = useAuth();
	const { gameState } = useGame();
	const { snapshots, isLoading } = useStatSnapshot();
	const { decks, isLoading: isLoadingDecks } = useDeck();
	const router = useRouter();
	const [timePeriodLabel, setTimePeriodLabel] = useState(timePeriodLabels[2]);
	const [podSizeLabel, setPodSizeLabel] = useState(podSizeLabels[0]);

	const podSize = labelToPodSize[podSizeLabel];
	const timePeriod = labelToTimePeriod[timePeriodLabel];

	const snapshot = useMemo(() => {
		return (
			snapshots.find((s) => s.period == timePeriod && s.playerCount == podSize)
				?.snapshot ?? defaultStatSnapshot
		);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [timePeriodLabel, podSizeLabel, snapshots, podSize, timePeriod]);

	const mostRecentDeck = snapshot.mostRecentPlayedDeck;
	const mostRecentDeckStats = mostRecentDeck?.statistics?.find(
		(s) => s.podSize == podSize
	)?.stats;

	const statCardData: StatCardData[] = [
		{
			title: "Games",
			data: snapshot.gamesPlayed ?? 0,
			subData: [],
			styles: statCardNumberStyles,
		},
		{
			title: "Wins",
			data: snapshot.gamesWon ?? 0,
			subData: [],
			styles: statCardNumberStyles,
		},
		{
			title: "Decks",
			data: snapshot.numDecks ?? 0,
			subData: [],
			styles: statCardNumberStyles,
		},
		{
			title: "Last Won",
			data: snapshot.lastWon
				? dayjs(snapshot.lastWon).format("MMM D, YYYY")
				: "-",
			subData: [],
			styles: statCardTextStyles,
		},
		{
			title: "Recently Played",
			data: mostRecentDeck ? mostRecentDeck.commander : "-",
			subData: [
				mostRecentDeckStats
					? mostRecentDeckStats.isCurrentWinStreak
						? "WON"
						: "LOSS"
					: "-",
			],
			styles: {
				main: "text-lg text-fg-light my-2",
				sub: `${
					!mostRecentDeckStats
						? ""
						: mostRecentDeckStats.isCurrentWinStreak
						? "text-success"
						: "text-error"
				} font-bold tracking-wider`,
			},
		},
		{
			title: "Most Played",
			data:
				snapshot.mostPlayedCommanders.length > 0
					? snapshot.mostPlayedCommanders[0]
					: "-",
			subData: snapshot.mostPlayedCommanders.slice(1, 4),
			styles: statCardTextStyles,
		},
		{
			title: "Least Played",
			data:
				snapshot.leastPlayedCommanders.length > 0
					? snapshot.leastPlayedCommanders[0]
					: "-",
			subData: snapshot.leastPlayedCommanders.slice(1, 4),
			styles: statCardTextStyles,
		},
		{
			title: "Streaks",
			data:
				snapshot.currentWinStreak && snapshot.isCurrentWinStreak != null
					? snapshot.isCurrentWinStreak
						? snapshot.currentWinStreak == 1
							? `${snapshot.currentWinStreak} Win`
							: `${snapshot.currentWinStreak} Wins`
						: snapshot.currentWinStreak == 1
						? `${snapshot.currentWinStreak} Loss`
						: `${snapshot.currentWinStreak} Losses`
					: "-",
			subData: [
				`Longest Win Streak: ${snapshot.longestWinStreak}`,
				`Longest Loss Streak: ${snapshot.longestLossStreak}`,
			],
			styles: {
				main: `text-lg ${
					snapshot.isCurrentWinStreak == null || snapshot.currentWinStreak === 0
						? "text-fg-light"
						: snapshot.isCurrentWinStreak
						? "text-success"
						: "text-error"
				} my-2`,
				sub: "text-fg-dark",
			},
		},
	];

	function renderStatCards() {
		return statCardData.map((data) => (
			<StatCard key={data.title}>
				<h3>{data.title}</h3>
				<div className={data.styles?.main}>{data.data}</div>
				{data.subData.map((sub, i) => (
					<div key={i} className={data.styles?.sub}>
						{sub}
					</div>
				))}
			</StatCard>
		));
	}

	return (
		<DashboardLayout>
			<DashboardHeader user={user} title="Command Zone" justify="justify-start">
				<div className="gap-4 w-full hidden lg:flex items-center">
					<div className="flex gap-2 items-center">
						<span className="text-sm">Time</span>
						<DropdownMenu
							options={timePeriodLabels}
							selected={timePeriodLabel}
							setSelected={setTimePeriodLabel}
						/>
					</div>

					<div className="flex gap-2 items-center">
						<span className="text-sm">Pod Size</span>
						<DropdownMenu
							options={podSizeLabels}
							selected={podSizeLabel}
							setSelected={setPodSizeLabel}
						/>
					</div>
				</div>
			</DashboardHeader>
			{isLoading ? (
				<LoadingSpinner />
			) : (
				<DashboardMain styles="!items-center">
					<div
						className={`dashboard-main-content-layout ${styles.gridLayout} `}
					>
						<div className="flex ml-4 gap-4 w-full mb-1 lg:hidden">
							<div className="flex gap-2 items-center">
								<span className="text-sm text-fg-dark">Time</span>
								<DropdownMenu
									options={timePeriodLabels}
									selected={timePeriodLabel}
									setSelected={setTimePeriodLabel}
								/>
							</div>

							<div className="flex gap-2 items-center">
								<span className="text-sm text-fg-dark">Pod Size</span>
								<DropdownMenu
									options={podSizeLabels}
									selected={podSizeLabel}
									setSelected={setPodSizeLabel}
								/>
							</div>
						</div>

						{/* No Decks Link To Deck Create */}
						{!isLoadingDecks && decks.length === 0 && (
							<StatCard
								styles="col-span-2"
								innerStyles="!px-2 !pt-4 !pb-4 !justify-center !items-stretch"
							>
								<div className="flex flex-col items-start gap-6 py-4 px-4">
									<h2 className="text-lg">No Decks Found</h2>
									<p>Add some decks to get started</p>
									<ButtonLink
										href="/decks/add"
										uppercase={false}
										style="transparent"
										styles="w-full text-center block border rounded border-surface-500"
									>
										Add Decks
									</ButtonLink>
								</div>
							</StatCard>
						)}

						{/* No Games Found Link to Add Games */}
						{!isLoadingDecks &&
							decks.length > 0 &&
							snapshot.gamesPlayed === 0 && (
								<StatCard
									styles="col-span-2 lg:row-start-3"
									innerStyles="!px-2 !pt-4 !pb-4 !justify-center !items-stretch"
								>
									<div className="flex flex-col items-start gap-6 py-4 px-4">
										<h2 className="text-lg">No Games Found</h2>
										<p>Add some games to start tracking</p>

										<ButtonLink
											href="/pod/create"
											uppercase={false}
											style="transparent"
											styles="w-full text-center block border rounded border-surface-500"
										>
											Host a Pod
										</ButtonLink>

										<ButtonLink
											href="/pod/join"
											uppercase={false}
											style="transparent"
											styles="w-full text-center block border rounded border-surface-500 -mt-4"
										>
											Join a Pod
										</ButtonLink>
									</div>
								</StatCard>
							)}
						{renderStatCards()}

						{snapshot.gamesPlayed > 0 && (
							<>
								{/* Line Chart */}
								<StatCard
									styles="col-span-4"
									innerStyles="!px-2 !pt-4 !pb-0 !justify-start !items-stretch"
								>
									<div className="w-full aspect-[3/1] min-h-[350px] block pb-4">
										<LineChart buckets={snapshot.winLossGamesByPeriod ?? []} />
									</div>
								</StatCard>
								{/* Donut Chart */}
								<StatCard
									styles="col-span-2"
									innerStyles="!px-2 !pt-4 !pb-4 !justify-center !items-stretch"
								>
									<div className="h-[350px] lg:h-full">
										<PieChart
											deckPlayCounts={snapshot.deckPlayCounts ?? []}
											gamesPlayed={snapshot.gamesPlayed}
										/>
									</div>
								</StatCard>
								{/* Commander Showcase */}
								{mostRecentDeck && mostRecentDeckStats && (
									<StatCard styles="col-span-2" innerStyles="!pb-2">
										<h3 className="pb-4 border-b border-surface-500 text-fg-light">
											Commander Showcase
										</h3>
										<DeckCard
											deck={mostRecentDeck}
											deckStats={mostRecentDeckStats}
											styles="!bg-transparent"
										/>
									</StatCard>
								)}
								{/* Recent Game Log */}
								<StatCard
									styles="col-span-4 !hidden lg:!flex max-h-[29rem]"
									innerStyles="lg:justify-start h-full"
								>
									<h3 className="pb-4 mb-4 border-b border-surface-500">
										Recent Games
									</h3>
									<div className="overflow-y-auto flex flex-col gap-2 pr-2">
										{gameState.games.length > 0 &&
											gameState.games.map((data) => (
												<GameLogCard key={data.id} game={data} size="sm" />
											))}
										<div className="hidden lg:block w-xs self-center">
											<div className="mx-10">
												<ButtonPrimary
													onClick={() => router.push("/log")}
													style="transparent"
                          styles="!mb-0"
													uppercase={false}
												>
													View All
												</ButtonPrimary>
											</div>
										</div>
									</div>
								</StatCard>
							</>
						)}

						<div className="lg:hidden w-full">
							<div className="mx-10">
								<ButtonPrimary
									onClick={() => router.push("/log")}
									style="transparent"
									uppercase={false}
								>
									View Games
								</ButtonPrimary>
							</div>
						</div>
					</div>
				</DashboardMain>
			)}
		</DashboardLayout>
	);
}

import { artifacts } from "@ignored/hardhat-vnext";

const Rocket = await artifacts.readArtifact("Rocket");
//    ^?
const Rocket2 = await artifacts.readArtifact("contracts/Rocket.sol:Rocket");
//    ^?
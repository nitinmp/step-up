import type { Division } from "./divisions";

/** Must match TIERED_SCORING_START_DATE in group-rules.ts */
export const DIVISION_CUTOVER_DATE = "2026-07-06";

/**
 * Each participant's division through 2026-07-05 (inclusive).
 * Sourced from the 6 Jul migration: Strider→Riser (32), Strider→Elite (4),
 * Elite→Strider (Varshali Khambete), and unchanged groups.
 */
export const DIVISION_BEFORE_CUTOVER: Record<string, "elite" | "strider"> = {
  "00461582-e7f7-4a35-8563-9b27331a5e75": "elite", // Mamtha
  "032a731a-8c4f-4620-b1e3-4be47c8fa938": "strider", // Sweezy
  "0715b7a0-1a0c-46de-a419-544d93f7177c": "strider", // Keerthi
  "0be2eee2-db55-4b34-9678-ad66916ba57d": "elite", // Mrunali Wankhede
  "0c89b5af-254e-4b38-beef-759b7586a2dd": "strider", // Anuradha Ganguly
  "1b378cd3-2449-4c47-a30b-ec36710739de": "strider", // Ansy
  "1ff36cbe-d365-486c-9c87-a3be405f2336": "strider", // Bharathi vijaya Kandukuri
  "2078eb54-fe1a-4d5d-9314-dfd4d59745d7": "strider", // Reddy
  "20e388cb-ed01-49b6-9525-f181acca5b2f": "strider", // Ballav Mundra
  "24c65129-0960-4235-9223-c11ccbd81a5a": "strider", // Shilpa
  "2c50b2f0-bf38-4e58-9e70-49d384e47541": "strider", // Sachin dube
  "2fd088f2-6db8-4afc-a224-b7ad9b53368e": "strider", // Sheetal
  "30ced8a8-2015-4429-a77d-96d95159b5dc": "strider", // Sunil swain
  "31bb98c0-d928-4015-9614-b2726007e68a": "strider", // Neethi
  "3cc81dcf-5853-42cd-ae70-bb48043a5d28": "strider", // Nitin Padmawar
  "3ce0a48d-dc85-4859-8e69-73b22dae2018": "strider", // Preeti Marawar
  "3e16277d-6c01-4162-96e6-c834fa395ea8": "strider", // Sanjay Bhagwat
  "3f6df32b-b8fb-4948-b167-f3b169438709": "strider", // SidWho Mahajan
  "3f7b235d-1364-4b50-a6d9-a0b9d1dba155": "strider", // Poonam Sareen
  "4669b36d-d4cb-45a6-8b87-98d72591ca8e": "elite", // Anu
  "4934e410-2c71-488f-a8a7-a7de630dc232": "strider", // Vijay Srinivas
  "4f0a6332-f726-41c9-b594-7e37f225a13e": "strider", // Chandan Bhullar
  "52707234-1897-47bd-b6fd-283b5ab6ffa1": "elite", // L N Ramaswamy
  "5573589f-c48c-41ef-89b4-205958e4844e": "strider", // Dnyaneshwar
  "58392548-252e-47c8-ac2d-0b06caba0363": "strider", // Rhena
  "5888345a-52b3-47f8-ac2a-9a37614d554b": "strider", // Manita Kumari
  "625e3c7c-66e5-4e3d-a7be-225ba4333348": "strider", // Megha Madhamshettiwar
  "65689836-b8da-4abe-94b7-c9556fcc160e": "strider", // Pushpa
  "6bfe264d-db76-4a2f-916a-18a7c207a763": "strider", // Prasanna Deshpande
  "6eabfe0f-fa5a-4685-92fc-3530901cdba9": "strider", // Gopal
  "6f42bc0c-7b07-4b11-a90a-ed151c00c6a5": "strider", // Bhaskar Devarakonda
  "79caf027-045a-4bc5-8597-07e9296518ed": "strider", // Varsha Uttarwar
  "886d2ed7-232c-4d3c-b264-55e511f112bc": "strider", // Nitin Wankhede
  "8f26511d-cd2a-48f4-bffa-be45ad32d8cb": "strider", // Netta mohit
  "992d67df-cb53-4857-8a83-2d873a3d8c69": "strider", // SHANTANU MUKUNDRAO CHAUDHARI
  "9989a38b-188c-49f7-948e-a925788a813d": "strider", // Usha
  "a83e0fa8-1dc2-489f-9999-158cee487946": "strider", // Atiksha
  "a8d7a754-0769-417d-9a36-81bafff16026": "strider", // Sheetal Dube
  "aa1e085b-55b7-4004-bb24-ee039fb2d0aa": "strider", // Sandesh Dube
  "ab0504e0-8af1-4610-baaa-2ac7546cc9e6": "strider", // Anusha Ramaswamy
  "afafd81d-8624-47d4-a621-9b42dc5ccffd": "strider", // Mohit Menon
  "b75408a5-3515-4a4f-aa52-2b613c8f5478": "strider", // Pranav Devarakonda
  "b807cb1b-cbca-43e0-a763-74f96c64595b": "strider", // Jyoti  Mahajan
  "bde6122f-b656-49ba-a618-d717af057d8c": "strider", // Dr. Shilpa R
  "bedf25d4-0d27-43a6-8d91-378e2cb73fa1": "strider", // Pavan Vasgi
  "c35aca4f-6469-4128-972d-e528591c44d1": "elite", // Chitti babu Masuri
  "c73007b5-58cb-4e92-912a-61fd98d4f6e6": "strider", // Ramanna Macherla
  "c88a2626-8e52-4373-b7d9-6f8f87362f8c": "strider", // Sagar
  "ca3daae5-05b1-4284-94a1-abe321d99090": "elite", // Lydia Pakala
  "cf24b00c-ebde-499d-a481-49546e3c4b35": "strider", // Sangeeta Das
  "d52b137e-c715-4939-9e1d-bce26f87ad5e": "strider", // Pallavi Padmawar
  "d6f6f900-72cc-44c9-8297-7f50508e3fed": "strider", // Vinod Narayana
  "d7664969-29c6-4a84-a9fd-32b91d7aaa90": "elite", // Parag
  "d7d8085b-2519-4f73-8b79-69d06e21f1b4": "strider", // Aruna
  "d803fcab-8315-492b-b0cf-a465ba517e5b": "strider", // Narmada
  "d9390c26-74e2-4b08-899a-5d3b088cd8fd": "strider", // Arun dube
  "d98c1513-0f20-4b92-a879-5e9f7cdc2496": "strider", // Vandana dube
  "de79c460-ab6d-47bf-84f1-22d5c8c63e70": "strider", // Lakshmi prasanna
  "e3a0a494-5c1b-4f1e-b450-2a13ad228ec2": "strider", // Sam
  "e7a93cbd-d746-4330-b2ee-07fd16f0c248": "strider", // Aditya Dube
  "e91b983b-2e3f-4c95-ba0b-a0d1f8e17d82": "strider", // Nagesh
  "eba1c375-e442-4311-9db5-437b4e01333e": "strider", // Simarjeet Bhullar
  "f15c9c60-563c-4aba-9696-1fb7055a7a28": "strider", // Nirupama
  "fd92914b-9d1a-4f72-a66e-05aa34067fc3": "elite", // Varshali Khambete
  "ff4a2805-ec44-4d1c-b7d7-68a6166c49cc": "strider", // Vijay Vanparthi
};

export function getDivisionForDate(
  userId: string,
  currentDivision: Division,
  asOfDate: string,
): Division {
  if (asOfDate >= DIVISION_CUTOVER_DATE) {
    return currentDivision;
  }

  const historical = DIVISION_BEFORE_CUTOVER[userId];
  if (historical) {
    return historical;
  }

  return currentDivision === "riser" ? "strider" : currentDivision;
}

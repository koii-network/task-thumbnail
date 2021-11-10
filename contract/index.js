import tallyBalance from "./tally_balance";

const handlers = [
  tallyBalance
];

export async function handle(state, action) {
  if (state.frozen) throw new ContractError("Contract frozen");
  const handler = handlers.find((fn) => fn.name === action.input.function);
  if (handler) return await handler(state, action);
  throw new ContractError(`Invalid function: "${action.input.function}"`);
}

export default async function tallyBalance(state, action) {
  const caller = action.caller;
  const input = action.input;
  const method = input.method;

  const koiiState = await SmartWeave.contracts.readContractState(
    state.koiiContractId
  );

  const callerBalance = koiiState.balances[caller] || 0;
  switch (method) {
    case "add":
      state.tally += callerBalance
      break
    case "subtract":
      state.tally -= callerBalance
      state.subtractions.push(SmartWeave.transaction.id);
  }
  return { state }
}

# task-template
Template to create, test, and deploy tasks

## Components

- `bin` Scripts to test and deploy tasks
- `contract` Source code for smart contract
- `executable` Source code for task executable
- `tests` Scripts to test task

## Scripts

- `build` Build the smartcontract
- `test` Runs all tests, or a secific test
- `deploy`
- `deployExecutable`
- `deployInitJson`
- `deployContract`

## Testing

1. Install dependencies using `yarn install`
2. Setup your `.env` using `cp .env.example .env`
3. Make sure redis is running (only required for service mode)
4. Test with node `yarn build && node test`
    - Or test with jest `yarn build && yarn test`

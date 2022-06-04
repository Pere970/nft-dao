# NFT DAO System
This repo contains the smart contracts to create a DAO using an ERC721 token for voting. It's been implemented using OpenZeppelin's Governor contracts.

Users can mint tokens to get into the DAO, and vote on proposals. Each NFT equals to one vote. **Minting tokens is not restricted** or users will not be charged a fee as it is a test dao system and won't be used on a real production environment.

The DAO is intended to be used to increment or decrement by one the value of the Counter smart contract.


![alt text](https://i.imgur.com/SdzgKLx.png)

## Development

requires

```
node >= 12.0
```

to install node modules

```
npm i
```

to compile run

```
npm run compile
```

to test

```
npm run test
```

to run coverage

```
npm run coverage
```

## Environment setup

please prepare `.env` file

```bash
touch .env
```

and add the following

```
INFURA_KEY = infura key
MNEMONIC = mnemonic (choose our development mnemonic to be able to interact with the deployed contracts with the deployer address)
PK = private-key
```

Note:`.env` should be created in root directory.

## Deployment

This project uses the hardhat-deploy plugin to deploy contracts. When a contract has been deployed, it is saved as JSON to the `deployments` directory, including its _address_ as well as its _abi_. It uses deployment tags that are used to deploy the contracts in the desired order.

### Deployment to rinkeby

General (one tag):
`npm run deploy:contracts:rinkeby --tags=<YOUR_TAG_NAME>`

General (multiple tags):
`npm run deploy:contracts:rinkeby --tags=<YOUR_TAG_NAME1>,<YOUR_TAG_NAME2>`


### Deployment to mainnet

General (one tag):
`npm run deploy:contracts:mainnet --tags=<YOUR_TAG_NAME>`

General (multiple tags):
`npm run deploy:contracts:mainnet --tags=<YOUR_TAG_NAME1>,<YOUR_TAG_NAME2>`

## Run frontend

After having installed all the modules, run the following command to run a basic frontend to interact with the DAO.

```
npm run serve
```
Port will be configured in the `.env` file by the name of "NEXT_PUBLIC_PORT".

## Code formatting

To format JS and Solidity code, run the following command:

`npm run format`

import { Container, Header, Button, Menu, Input, Card, Table, Form, Label } from 'semantic-ui-react';
import { React, useEffect, useState } from "react";
import { Link } from '../routes';
import Web3Modal from 'web3modal';
import { ethers } from 'ethers';
import NFT from '../deployments/rinkeby/DaoNFT.json';
import Governor from '../deployments/rinkeby/GovernorContract.json';
import Counter from '../deployments/rinkeby/Counter.json';
import { useRouter } from "next/router";
import 'semantic-ui-css/semantic.min.css'
const BLOCK_AVG_TIME = process.env.NEXT_PUBLIC_AVG_BLOCKTIME; //Avg Rinkeby Block mining time in seconds
const infProjectId = process.env.NEXT_PUBLIC_INFURA_KEY

const ProposalStatus = {
        0: "Pending",
        1: "Active",
        2: "Canceled",
        3: "Defeated",
        4: "Succeeded",
        5: "Queued",
        6: "Expired",
        7: "Executed"
}

export default function Home() {
    const [accountBalance, setAccountBalance] = useState(0);
    const [connectedAccount, setConnectedAccount] = useState('');
    const [tokenSymbol, setTokenSymbol] = useState('');
    const [mintAmount, setMinAmount] = useState(0);
    const [activeProposals, setActiveProposals] = useState([]);
    const [upcomingProposals, setUpcomingProposals] = useState([]);
    const [pastProposals, setPastProposals] = useState([]);
    const [loading, setLoading] = useState(false);
    const [proposalDesc, setProposalDesc] = useState('');
    const [proposalAction, setProposalAction] = useState('');
    const [counterValue, setCounterValue] = useState(0);
    const router = useRouter();

    useEffect(()=> {
        getCurrentBalance();
        getTokenSymbol();
        getProposals();
        getCurrentCounterValue();
      }, []);

    async function getCurrentCounterValue() {
      const provider = new ethers.providers.InfuraProvider("rinkeby", infProjectId)
      const counterContract = new ethers.Contract(Counter.address, Counter.abi, provider)
      const counterValue = await counterContract.current();
      setCounterValue(counterValue);
    }

    async function getTokenSymbol() {
      const provider = new ethers.providers.InfuraProvider("rinkeby", infProjectId)
      const nftContract = new ethers.Contract(NFT.address, NFT.abi, provider)
      const tokenSymbol = await nftContract.symbol();
      setTokenSymbol(tokenSymbol);
    }

    async function getProposals() {
      setUpcomingProposals([]);
      setPastProposals([]);
      setActiveProposals([]);

      const provider = new ethers.providers.InfuraProvider("rinkeby", infProjectId);
      const governorContract = new ethers.Contract(Governor.address, Governor.abi, provider);
      const currentBlock = await provider.getBlockNumber();
      const events = await governorContract.queryFilter("ProposalCreated", 0, currentBlock);
      
      var activeProposalsArray = activeProposals;
      var upcomingProposalsArray = upcomingProposals;
      var pastProposalsArray = pastProposals;

      for (const event of events) {
        var proposal = {
          id: event.args.proposalId.toString(),
          description: event.args.description,
          proposer: event.args.proposer
        }

        const proposalStatus = await governorContract.state(event.args.proposalId);
        proposal.status = proposalStatus;
        if (event.args.startBlock > currentBlock) {
          const date = new Date();
          const votingStarts = (event.args.startBlock - currentBlock) * BLOCK_AVG_TIME;
          date.setTime(date.getTime() + (votingStarts * 1000)); //Add time in seconds
          proposal.votingStart = date;

          upcomingProposalsArray.push(proposal);
        }
        else if (event.args.endBlock > currentBlock
          || ProposalStatus[proposalStatus] == "Succeeded"
          || ProposalStatus[proposalStatus] == "Queued") {
          const nftContract = new ethers.Contract(NFT.address, NFT.abi, provider)
          proposal.supplyAtVotingStart = (await nftContract.getPastTotalSupply(event.args.startBlock)).toNumber();
          const proposalInfo = await governorContract.proposals(event.args.proposalId);
          proposal.forVotes = proposalInfo.forVotes.toNumber();
          proposal.againstVotes = proposalInfo.againstVotes.toNumber();
          proposal.abstainVotes = proposalInfo.abstainVotes.toNumber();
          const date = new Date();
          const votingEnd = (event.args.endBlock - currentBlock) * BLOCK_AVG_TIME;
          date.setTime(date.getTime() + (votingEnd * 1000));
          proposal.votingEnd = date;

          activeProposalsArray.push(proposal);
        }
        else{
          const proposalInfo = await governorContract.proposals(event.args.proposalId);
          proposal.forVotes = proposalInfo.forVotes.toNumber();
          proposal.againstVotes = proposalInfo.againstVotes.toNumber();
          proposal.abstainVotes = proposalInfo.abstainVotes.toNumber();
          const blockDiff = currentBlock - event.args.endBlock.toNumber();
          const date = new Date();
          date.setTime(date.getTime() - (blockDiff * BLOCK_AVG_TIME * 1000));
          proposal.votingEnd = date

          pastProposalsArray.push(proposal)
        }
      }
      setActiveProposals(activeProposalsArray);
      setPastProposals(pastProposalsArray);
      setUpcomingProposals(upcomingProposalsArray);
    }

    async function queueProposal(proposalId){
      setLoading(true);
      const web3Modal = new Web3Modal()
      const connection = await web3Modal.connect()
      const provider = new ethers.providers.Web3Provider(connection)
      const signer = provider.getSigner()
      const governorContract = new ethers.Contract(Governor.address, Governor.abi, signer);
      const tx = await governorContract["queue(uint256)"](proposalId);
      await tx.wait();
      setLoading(false);
      router.reload(window.location.pathname);
    }

    async function executeProposal(proposalId){
      
      try{
        setLoading(true);
        const web3Modal = new Web3Modal()
        const connection = await web3Modal.connect()
        const provider = new ethers.providers.Web3Provider(connection)
        const signer = provider.getSigner()
        const governorContract = new ethers.Contract(Governor.address, Governor.abi, signer);
        const tx = await governorContract["execute(uint256)"](proposalId, { gasLimit: 1000000});
        await tx.wait();
        setLoading(false);
        router.reload(window.location.pathname);
      }
      catch(err){
        console.log(err)
      }
    }

    async function voteProposal(proposalId, support){
      if(accountBalance > 0){
        setLoading(true);
        const web3Modal = new Web3Modal()
        const connection = await web3Modal.connect()
        const provider = new ethers.providers.Web3Provider(connection)
        const signer = provider.getSigner()
        const governorContract = new ethers.Contract(Governor.address, Governor.abi, signer);
        const tx = await governorContract.castVote(proposalId, support);
        await tx.wait();
        setLoading(false);
        router.reload(window.location.pathname);
      }
    }

    async function mintTokens(mintAmount){
     
      setLoading(true);
      const web3Modal = new Web3Modal()
      const connection = await web3Modal.connect()
      const provider = new ethers.providers.Web3Provider(connection)
      const signer = provider.getSigner()
      console.log(signer)
      const nftContract = new ethers.Contract(NFT.address, NFT.abi, signer);
      await nftContract.mintTokens(mintAmount);
      await nftContract.delegate(provider.provider.selectedAddress);
      setLoading(false);
      router.reload(window.location.pathname);
    }

    async function getCurrentBalance() {
      try{
          const web3Modal = new Web3Modal()
          const connection = await web3Modal.connect()
          const provider = new ethers.providers.Web3Provider(connection)
          const signer = provider.getSigner()
          const contract = new ethers.Contract(NFT.address, NFT.abi, signer)
          const userBalance = await contract.balanceOf(provider.provider.selectedAddress);
          setConnectedAccount(provider.provider.selectedAddress);
          setAccountBalance(userBalance.toString());
          const tokenSymbol = await contract.symbol();
          setTokenSymbol(tokenSymbol);
      }
      catch(err){
          console.log(err)
      }
    }

    async function createProposal(description, counterAction){
      if (description.length > 0) {

        const web3Modal = new Web3Modal()
        const connection = await web3Modal.connect()
        const provider = new ethers.providers.Web3Provider(connection)
        const signer = provider.getSigner()
        const counter = new ethers.Contract(Counter.address, Counter.abi, signer);
        const governor = new ethers.Contract(Governor.address, Governor.abi, signer);

        let encodedIncrementFunction;
        let proposalDescription = description;

        if(counterAction == "increment"){
          encodedIncrementFunction = counter.interface.encodeFunctionData(
            "increment",
            []
            );
        }
        else {
          encodedIncrementFunction = counter.interface.encodeFunctionData(
            "decrement",
            []
            );
        }
        try{
          setLoading(true);
          const tx = await governor["propose(address[],uint256[],bytes[],string)"](
            [counter.address],
            [0],
            [encodedIncrementFunction],
            proposalDescription,
            { gasLimit: 1000000}
          );
          const txReceipt = await tx.wait();
          setLoading(false);
          router.reload(window.location.pathname);
        }
        catch(err){
          console.log(err);
        }
      }
    }

    function renderProposals (proposals) {
      if (proposals.length > 0){
        const items = proposals.map(function (proposal) {
          
          //Voting has ended
          if (!proposal.votingStart
            && proposal.votingEnd < new Date()){
            if(ProposalStatus[proposal.status] == "Succeeded") { //It needs to be queued
              return {
                header: `ID: ${proposal.id}`,
                description: proposal.description,
                meta: ProposalStatus[proposal.status],
                fluid: true,
                extra: (
                  <div>
                    { accountBalance > 0 ? 
                      <Button 
                        content="Queue proposal"
                        loading={loading} 
                        onClick={async () => await queueProposal(proposal.id)}
                      />
                      : 
                      <div></div> 
                    }
                  </div>
                )
              }
            }
            else if (ProposalStatus[proposal.status] == "Queued") { //It needs to be executed
              return {
                header: `ID: ${proposal.id}`,
                description: proposal.description,
                meta: ProposalStatus[proposal.status],
                fluid: true,
                extra: (
                  <div>
                    <Button 
                      content="Execute proposal"
                      loading={loading} 
                      onClick={async () => await executeProposal(proposal.id)}
                    />
                  </div>
                )
              }
            }
            return {
              header: `ID: ${proposal.id}`,
              description: proposal.description,
              fluid: true,
              meta: ProposalStatus[proposal.status],
              extra: (
                <div>
                  <p>Voting ended: {proposal.votingEnd.toString()}</p>
                  <Table celled>
                    <Table.Row>
                      <Table.Cell><p>For votes: {proposal.forVotes}</p></Table.Cell>
                      <Table.Cell><p>Against votes: {proposal.againstVotes}</p></Table.Cell>
                      <Table.Cell><p>Abstain votes: {proposal.abstainVotes}</p></Table.Cell>
                    </Table.Row>
                  </Table>
                </div>
              )
            }
          }
          else if(proposal.votingStart != undefined
            && proposal.votingStart > new Date()){
              return {
                header: `ID: ${proposal.id}`,
                description: proposal.description,
                meta: ProposalStatus[proposal.status],
                fluid: true,
                extra: (
                  <div>
                    <p>Voting starts at: {proposal.votingStart.toString()}</p>
                  </div>
                )
              }
          }
          else{
             if (ProposalStatus[proposal.status] == "Active") { //It can be voted on
              return {
                header: `ID: ${proposal.id}`,
                description: proposal.description,
                fluid: true,
                meta: ProposalStatus[proposal.status],
                extra: (
                  <div>
                    <p>Voting ends: {proposal.votingEnd.toString()}</p>
                    <br></br>
                    Total votes: {(proposal.forVotes + proposal.againstVotes + proposal.abstainVotes)} / {proposal.supplyAtVotingStart}
                    <br></br>
                    <Table celled>
                      <Table.Row>
                        <Table.Cell>
                          <p>For votes: {proposal.forVotes}</p>
                          {accountBalance > 0 ?
                          <Button 
                            loading={loading}
                            content="Vote for"
                            onClick={async () => await voteProposal(proposal.id, 1)}
                          /> : <div></div>}
                        </Table.Cell>
                        <Table.Cell>
                          <p>Against votes: {proposal.againstVotes}</p>
                          {accountBalance > 0 ?
                          <Button 
                            loading={loading}
                            content="Vote against"
                            onClick={async () => await voteProposal(proposal.id, 0)}
                          /> : <div></div>}
                        </Table.Cell>
                        <Table.Cell>
                          <p>Abstain votes: {proposal.abstainVotes}</p>
                          {accountBalance > 0 ?
                          <Button 
                            loading={loading}
                            content="Abstain vote"
                            onClick={async () => await voteProposal(proposal.id, 2)}
                          />
                          : <div></div>}
                        </Table.Cell>
                      </Table.Row>
                    </Table>
                  </div>
                )
              }
            }
          }
        })
        
        return <Card.Group items={items}/>;
      }

      return <Header textAlign="center" as="h5">There are no proposals</Header>;    
    }

  return (
    <div>
      <Container>
      <Menu style={{ marginTop: '10px' }}>
        <Link route='/'>
          <a className="item">
              DAO Logo
          </a>
        </Link>
        <Menu.Menu position="right">
          <div className="header item">
              Balance: { accountBalance } { tokenSymbol }
          </div>
        </Menu.Menu>
      </Menu>
      { connectedAccount ? <Container textAlign="right"><Label>Connected Account: {connectedAccount}</Label></Container> : <div></div>}
      </Container>
      <br></br>
      <br></br>
      <Container>
        <Header as='h2'>Current Counter value: {String(counterValue)}</Header>
      </Container>
      <br></br>
      <br></br>
      <Container>
        <Header>Proposals</Header>
        <Header as='h3'>Upcoming</Header>
        {renderProposals(upcomingProposals)}
        <Header as='h3'>Active</Header>
        {renderProposals(activeProposals)}
        <Header as='h3'>Past</Header>
        {renderProposals(pastProposals)}
      </Container>
      <br></br>
      <br></br>
      <Container>
        <Header>Create Proposals</Header>
        <Header content="Proposal Description" as="h5"/>
        <Input
            fluid
            type='text'
            onChange={(e) => setProposalDesc(e.target.value)}
            value={proposalDesc}
        />
        <Header content="Proposal Action" as="h5"/>
        <Form.Select
            fluid
            onChange={(e, {value}) => setProposalAction(value)}
            options={[
              { key: 'i', text: 'Increment', value: 'increment' },
              { key: 'd', text: 'Decrement', value: 'decrement' }
            ]}
        />
        <br></br>
        <Button
          content="Create Proposal"
          loading={loading}
          onClick={async () => await createProposal(proposalDesc, proposalAction)}
        />
      </Container>
      <br></br>
      <br></br>
      <Container>
        <Header>Mint Tokens</Header>
        <div>
          <Input
            label={{ content: tokenSymbol }}
            labelPosition='right'
            type='number'
            onChange={(e) => setMinAmount(e.target.value)}
            value={mintAmount}
          />
        </div>
        <br></br>
        <div>
          <Button 
            content="Mint tokens!" 
            loading={loading}
            onClick={async () => await mintTokens(mintAmount)}
          />
        </div>
      </Container>
    </div>
  )
}

import { ethers } from 'ethers';
import { config } from '../config/env.config';
import { logger } from '../utils/logger.util';

const RGE_TOKEN_ADDRESS = '0xe5Ee677388a6393d135bEd00213E150b1F64b032';
const ERC20_ABI = [
  'function balanceOf(address owner) view returns (uint256)',
  'function decimals() view returns (uint8)',
];

export class FraxtalService {
  private provider: ethers.JsonRpcProvider;
  private tokenContract: ethers.Contract;
  private decimals: number | null = null;

  constructor() {
    this.provider = new ethers.JsonRpcProvider(config.FRAXTAL_RPC_URL);
    this.tokenContract = new ethers.Contract(RGE_TOKEN_ADDRESS, ERC20_ABI, this.provider);
    logger.info('FraxtalService initialized', { rpcUrl: config.FRAXTAL_RPC_URL, token: RGE_TOKEN_ADDRESS });
  }

  private async getDecimals(): Promise<number> {
    if (this.decimals !== null) return this.decimals;
    try {
      const decimals = await this.tokenContract.decimals();
      this.decimals = Number(decimals);
      return this.decimals!;
    } catch (error) {
      logger.error('Failed to fetch token decimals, defaulting to 18', error);
      return 18;
    }
  }

  async getRGEBalance(address: string): Promise<number> {
    try {
      if (!ethers.isAddress(address)) {
        throw new Error('Invalid address format');
      }

      // Add timeout to the call
      const balancePromise = this.tokenContract.balanceOf(address);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('RPC Timeout')), 5000)
      );

      const rawBalance = await Promise.race([balancePromise, timeoutPromise]) as bigint;
      const decimals = await this.getDecimals();
      
      const formattedBalance = ethers.formatUnits(rawBalance, decimals);
      
      return parseFloat(formattedBalance);
    } catch (error) {
      logger.error(`Failed to get RGE balance for ${address}`, error);
      // Return 0 on error to be safe, or throw? 
      // If RPC fails, we probably want to know, but for tier check maybe 0 is safer to prevent unauthorized access?
      // But the task says "fallback to cached tier" (T060). 
      // So I should throw here and let the caller handle the fallback.
      throw error;
    }
  }
  
  isValidAddress(address: string): boolean {
      return ethers.isAddress(address);
  }
}

export const fraxtalService = new FraxtalService();

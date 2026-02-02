# FREE BASE MAINNET ETH - Stakely Faucet

## Steps to Get Free ETH:

1. **Go to**: https://stakely.io/faucet/base-eth
2. **Enter wallet**: `0x069c76420DD98CaFa97CC1D349bc1cC708284032`
3. **Complete captcha**
4. **Tweet the request ID** (Stakely will ask you to)
5. **Wait for processing** (varies)

## Once ETH Arrives:

1. **Deploy contracts**:
```bash
cd /root/.openclaw/workspace/projects/contest-2026-02
export BASE_RPC=https://base-mainnet.public.blastapi.io
export PRIVATE_KEY=0x4fc9391f360716d905862964a019a83cc1dc10e7232b2b93d4196b212319ec35
forge script contracts/script/DeploySubstrate.s.sol --rpc-url $BASE_RPC --broadcast --private-key $PRIVATE_KEY
```

2. **Tweet @bankrbot** (from bankrbot-tweet.md)

3. **Monitor trading volume** (for scoring)

## Stakely Faucet Limits:
- Amount: Unknown (typically small, 0.001-0.01 ETH)
- Requirements: Twitter post, captcha
- Processing: May take time

## If Stakely Doesn't Work:
- Try other faucets
- Bridge from Ethereum if possible

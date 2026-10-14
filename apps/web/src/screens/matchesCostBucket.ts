type MatchesCostBucketParams = {
  cost: number;
  bucket: number;
  highestBucket: number;
};

export function matchesCostBucket({ cost, bucket, highestBucket }: MatchesCostBucketParams): boolean {
  if (bucket === highestBucket) {
    return cost >= bucket;
  }
  return cost === bucket;
}

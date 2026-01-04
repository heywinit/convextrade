import { Card, CardContent } from "@/components/ui/card";
import { TokenCard } from "@/components/ui/token-card";
import { TOKENS, type TokenConfig } from "../types";

type TokenData = {
  price: number | undefined;
  chartData: Array<{ timestamp: number; price: number }>;
  changePercentage: number;
};

type TokenDataMap = {
  CNVX: TokenData;
  BUN: TokenData;
  VITE: TokenData;
  SHAD: TokenData;
  FLWR: TokenData;
};

type TokensViewProps = {
  tokenDataMap: TokenDataMap;
};

export function TokensView({ tokenDataMap }: TokensViewProps) {
  return (
    <>
      {TOKENS.slice(0, 4).map((token: TokenConfig) => {
        const data = tokenDataMap[token.symbol as keyof typeof tokenDataMap];
        return (
          <TokenCard
            key={token.symbol}
            symbol={token.symbol}
            icon={token.icon}
            iconBgColor={token.iconBgColor}
            iconColor={token.iconColor}
            price={data.price}
            changePercentage={data.changePercentage}
            chartData={data.chartData}
          />
        );
      })}

      <Card className="col-span-2 row-span-2 flex flex-col">
        <CardContent className="flex flex-1 flex-col gap-4">
          <div>
            <h2 className="mb-2 font-semibold text-lg">About ConvexTrade</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">
              A real-time trading terminal powered by Convex's real-time sync.
            </p>
          </div>

          <div className="mt-auto pt-2">
            <p className="text-muted-foreground text-sm leading-relaxed">
              <span>
                built by{" "}
                <a
                  href="https://x.com/hiwinit"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  winit.
                </a>{" "}
              </span>
              <span>
                source @{" "}
                <a
                  href="https://github.com/heywinit/convextrade"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  github
                </a>
              </span>
            </p>
          </div>
        </CardContent>
      </Card>

      {TOKENS.slice(4).map((token: TokenConfig) => {
        const data = tokenDataMap[token.symbol as keyof typeof tokenDataMap];
        return (
          <TokenCard
            key={token.symbol}
            symbol={token.symbol}
            icon={token.icon}
            iconBgColor={token.iconBgColor}
            iconColor={token.iconColor}
            price={data.price}
            changePercentage={data.changePercentage}
            chartData={data.chartData}
          />
        );
      })}
    </>
  );
}

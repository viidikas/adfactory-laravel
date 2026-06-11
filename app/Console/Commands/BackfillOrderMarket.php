<?php

namespace App\Console\Commands;

use App\Models\Market;
use App\Models\Order;
use Illuminate\Console\Command;

class BackfillOrderMarket extends Command
{
    protected $signature = 'orders:backfill-market {--dry-run : Report matches without writing}';

    protected $description = 'Backfill orders.market_id by matching the legacy free-text market string to markets.code';

    public function handle(): int
    {
        $dry = (bool) $this->option('dry-run');

        // Build a case-insensitive code => id lookup once.
        $byCode = Market::all()->keyBy(fn ($m) => mb_strtolower(trim($m->code)));

        $matched = 0;
        $unmatched = [];

        // Only touch rows that still need it; idempotent and re-runnable.
        Order::whereNull('market_id')
            ->whereNotNull('market')
            ->where('market', '!=', '')
            ->each(function (Order $order) use ($byCode, $dry, &$matched, &$unmatched) {
                $key = mb_strtolower(trim($order->market));
                $market = $byCode->get($key);

                if (! $market) {
                    $unmatched[$order->market] = ($unmatched[$order->market] ?? 0) + 1;

                    return;
                }

                $matched++;
                if (! $dry) {
                    $order->forceFill(['market_id' => $market->id])->save();
                }
            });

        $this->info(($dry ? '[dry-run] ' : '').sprintf('Backfilled %d order(s).', $matched));

        if ($unmatched) {
            $this->warn('Unmatched market strings (left untouched):');
            foreach ($unmatched as $code => $count) {
                $this->line(sprintf('  %s — %d order(s)', $code === '' ? '(blank)' : $code, $count));
            }
        }

        return self::SUCCESS;
    }
}

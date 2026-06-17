<?php

namespace Tests\Feature;

use App\Models\Order;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/**
 * Admin management of submitted orders: delete (with cascade), reject (a
 * terminal status), and modify (replace items + note via the update endpoint).
 */
class OrderAdminManageTest extends TestCase
{
    use RefreshDatabase;

    private function makeOrder($market, $lead, array $keys = ['k']): string
    {
        $items = array_map(fn ($k) => $this->itemPayload($k), $keys);

        return $this->asUser($lead)->postJson('/api/orders', [
            'market_id' => $market->id,
            'items' => $items,
        ])->json('id');
    }

    public function test_admin_can_delete_order_and_items_cascade(): void
    {
        $market = $this->market(['code' => 'FI']);
        $this->copy($market, ['copy_key' => 'k']);
        $id = $this->makeOrder($market, $this->lead());
        $this->assertDatabaseHas('order_items', ['order_id' => $id]);

        $this->asUser($this->admin())->deleteJson('/api/orders/'.$id)
            ->assertStatus(200)->assertJson(['ok' => true]);

        $this->assertDatabaseMissing('orders', ['id' => $id]);
        $this->assertDatabaseMissing('order_items', ['order_id' => $id]);
    }

    public function test_lead_cannot_delete_order(): void
    {
        $market = $this->market(['code' => 'FI']);
        $this->copy($market, ['copy_key' => 'k']);
        $lead = $this->lead();
        $id = $this->makeOrder($market, $lead);

        $this->asUser($lead)->deleteJson('/api/orders/'.$id)->assertStatus(403);
        $this->assertDatabaseHas('orders', ['id' => $id]);
    }

    public function test_admin_can_reject_order(): void
    {
        $market = $this->market(['code' => 'FI']);
        $this->copy($market, ['copy_key' => 'k']);
        $id = $this->makeOrder($market, $this->lead());

        $this->asUser($this->admin())->putJson('/api/orders/'.$id, ['status' => 'rejected'])
            ->assertStatus(200)->assertJson(['status' => 'rejected']);
        $this->assertDatabaseHas('orders', ['id' => $id, 'status' => 'rejected']);
    }

    public function test_admin_can_modify_order_items_and_note(): void
    {
        $market = $this->market(['code' => 'FI']);
        $this->copy($market, ['copy_key' => 'k1']);
        $this->copy($market, ['copy_key' => 'k2']);
        $id = $this->makeOrder($market, $this->lead(), ['k1', 'k2']);

        $this->asUser($this->admin())->putJson('/api/orders/'.$id, [
            'items' => [$this->itemPayload('k2')],
            'note' => 'edited by admin',
        ])->assertStatus(200);

        $order = Order::with('items')->find($id);
        $this->assertCount(1, $order->items);
        $this->assertSame('k2', $order->items[0]->copy_key);
        $this->assertSame('edited by admin', $order->note);
    }

    public function test_cannot_edit_items_on_a_ready_order(): void
    {
        $market = $this->market(['code' => 'FI']);
        $this->copy($market, ['copy_key' => 'k']);
        $id = $this->makeOrder($market, $this->lead());
        $admin = $this->admin();

        $this->asUser($admin)->putJson('/api/orders/'.$id, ['status' => 'ready'])->assertStatus(200);

        $this->asUser($admin)->putJson('/api/orders/'.$id, ['items' => [$this->itemPayload('k')]])
            ->assertStatus(422);
    }

    public function test_lead_cannot_change_status(): void
    {
        $market = $this->market(['code' => 'FI']);
        $this->copy($market, ['copy_key' => 'k']);
        $lead = $this->lead();
        $id = $this->makeOrder($market, $lead);

        $this->asUser($lead)->putJson('/api/orders/'.$id, ['status' => 'rejected'])->assertStatus(403);
    }
}

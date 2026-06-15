<?php

namespace App\Support;

/**
 * Representative dataset for the AD.FACTORY design preview (mirrors the design
 * handoff's data.js). PREVIEW-ONLY — the real screens will read Eloquent models
 * (Clip, Template, Order, CopyMap) instead. Kept in one place so every
 * /design/* route renders from the same data.
 */
class DesignPreviewData
{
    public const THUMBS = ['#2e6b57', '#365b7a', '#7a5a36', '#6b3550', '#41506b', '#5a6b35', '#356b6b', '#6b4135', '#4b3a6b', '#2e5b6b', '#6b6235', '#553a2e'];

    public static function markets(): array
    {
        return [
            ['code' => 'EE', 'flag' => '🇪🇪', 'name' => 'Estonia'],
            ['code' => 'ES', 'flag' => '🇪🇸', 'name' => 'Spain'],
            ['code' => 'DE', 'flag' => '🇩🇪', 'name' => 'Germany'],
            ['code' => 'FR', 'flag' => '🇫🇷', 'name' => 'France'],
            ['code' => 'FI', 'flag' => '🇫🇮', 'name' => 'Finland'],
        ];
    }

    public static function brands(): array
    {
        return ['Monefit SmartSaver', 'Monefit Credit', 'Credit24', 'Creditstar'];
    }

    public static function categories(): array
    {
        return ['Hook', 'Lifestyle', 'Product', 'Testimonial', 'CTA', 'B-roll'];
    }

    public static function statuses(): array
    {
        return ['Draft', 'Submitted', 'In production', 'Rendering', 'Review', 'Delivered'];
    }

    public static function langs(): array
    {
        return ['EN', 'ES', 'DE', 'EE', 'FR'];
    }

    public static function clips(): array
    {
        $defs = [
            ['Sunrise commute — phone unlock', 'Hook', 8, '9:16', ['urban', 'morning', 'hands']],
            ['Coffee + savings app glance', 'Lifestyle', 12, '9:16', ['kitchen', 'warm', 'app']],
            ['Vault balance count-up', 'Product', 6, '9:16', ['screen-rec', 'mint', 'numbers']],
            ['Couple reviewing budget', 'Lifestyle', 15, '1:1', ['home', 'couple', 'calm']],
            ['9.96% APY reveal', 'Hook', 5, '9:16', ['type', 'mint', 'bold']],
            ['Tap to deposit — UI close', 'Product', 7, '9:16', ['screen-rec', 'gesture']],
            ['Testimonial — Maria, Tallinn', 'Testimonial', 22, '9:16', ['interview', 'face']],
            ['City night timelapse', 'B-roll', 10, '16:9', ['urban', 'night', 'lights']],
            ['Hands counting cash → app', 'Hook', 9, '9:16', ['transition', 'money']],
            ['Get started CTA card', 'CTA', 4, '9:16', ['type', 'black', 'pill']],
            ['Office desk — laptop signup', 'Product', 13, '16:9', ['desk', 'signup']],
            ['Beach savings goal montage', 'Lifestyle', 18, '9:16', ['travel', 'warm', 'goal']],
            ['Testimonial — Lukas, Berlin', 'Testimonial', 20, '9:16', ['interview', 'face']],
            ['Slow-mo card tap', 'B-roll', 6, '9:16', ['macro', 'card']],
            ['Withdrawal in 1 day — type', 'Hook', 5, '1:1', ['type', 'mint']],
            ['Family kitchen evening', 'Lifestyle', 16, '9:16', ['home', 'warm', 'family']],
            ['Compound interest graph anim', 'Product', 11, '16:9', ['motion', 'graph', 'mint']],
            ['Get verified — passport scan', 'Product', 9, '9:16', ['kyc', 'screen-rec']],
            ['Rainy window, phone glow', 'B-roll', 8, '9:16', ['mood', 'rain']],
            ['Closing CTA — download', 'CTA', 4, '9:16', ['type', 'black']],
        ];
        $markets = self::markets();
        $clips = [];
        foreach ($defs as $i => $d) {
            [$name, $cat, $dur, $aspect, $tags] = $d;
            $clips[] = [
                'id' => 'CLP-'.(1042 + $i),
                'name' => $name,
                'category' => $cat,
                'duration' => $dur,
                'aspect' => $aspect,
                'tags' => $tags,
                'color' => self::THUMBS[$i % count(self::THUMBS)],
                'market' => $markets[$i % count($markets)]['code'],
                'resolution' => $aspect === '16:9' ? '1920×1080' : ($aspect === '1:1' ? '1080×1080' : '1080×1920'),
                'addedDays' => $i * 3 + 2,
                'usedCount' => ($i * 7 + 3) % 19,
            ];
        }

        return $clips;
    }

    public static function designs(): array
    {
        $t = self::THUMBS;

        return [
            ['id' => 'TMPL-01', 'name' => 'Hook → Proof → CTA', 'scenes' => 3, 'aspect' => '9:16', 'dur' => 15, 'color' => $t[0], 'kind' => 'Performance'],
            ['id' => 'TMPL-02', 'name' => 'Single value statement', 'scenes' => 1, 'aspect' => '9:16', 'dur' => 8, 'color' => $t[4], 'kind' => 'Awareness'],
            ['id' => 'TMPL-03', 'name' => 'Testimonial carousel', 'scenes' => 4, 'aspect' => '1:1', 'dur' => 20, 'color' => $t[6], 'kind' => 'Trust'],
            ['id' => 'TMPL-04', 'name' => 'Product walkthrough', 'scenes' => 5, 'aspect' => '9:16', 'dur' => 25, 'color' => $t[2], 'kind' => 'Consideration'],
            ['id' => 'TMPL-05', 'name' => 'Square feed promo', 'scenes' => 3, 'aspect' => '1:1', 'dur' => 12, 'color' => $t[9], 'kind' => 'Performance'],
            ['id' => 'TMPL-06', 'name' => 'Wide YouTube pre-roll', 'scenes' => 4, 'aspect' => '16:9', 'dur' => 30, 'color' => $t[7], 'kind' => 'Awareness'],
        ];
    }

    public static function orders(): array
    {
        $statuses = self::statuses();
        $designs = self::designs();
        $defs = [
            ['Q3 SmartSaver — APY push (ES)', 'Monefit SmartSaver', 'ES', 'Review', 'TMPL-01', 5, 'Elena Ruiz', 1],
            ['Vault launch — Estonia reels', 'Monefit SmartSaver', 'EE', 'In production', 'TMPL-04', 8, 'Karl Tamm', 2],
            ['Testimonials cutdown — DE', 'Monefit SmartSaver', 'DE', 'Rendering', 'TMPL-03', 4, 'Lukas Weber', 0],
            ['Credit24 retarget — FR', 'Credit24', 'FR', 'Submitted', 'TMPL-05', 3, 'Amélie Roy', 4],
            ['Always-on hooks — batch 12', 'Monefit Credit', 'EE', 'Delivered', 'TMPL-02', 12, 'Karl Tamm', 9],
            ['YouTube pre-roll — FI test', 'Monefit SmartSaver', 'FI', 'Draft', 'TMPL-06', 4, 'Sofia Korhonen', 0],
            ['Withdrawal speed — ES set', 'Monefit SmartSaver', 'ES', 'In production', 'TMPL-01', 6, 'Elena Ruiz', 3],
            ['Brand awareness — DE wide', 'Creditstar', 'DE', 'Review', 'TMPL-06', 2, 'Lukas Weber', 1],
            ['Compound interest explainer', 'Monefit SmartSaver', 'EE', 'Delivered', 'TMPL-04', 5, 'Karl Tamm', 14],
        ];
        $due = [2, 5, 1, 8, -3, 12, 3, 4, -10];
        $orders = [];
        foreach ($defs as $i => $o) {
            $stIdx = array_search($o[3], $statuses, true);
            $aspect = '9:16';
            foreach ($designs as $d) {
                if ($d['id'] === $o[4]) {
                    $aspect = $d['aspect'];
                    break;
                }
            }
            $orders[] = [
                'id' => 'AF-'.(2401 + $i),
                'title' => $o[0],
                'brand' => $o[1],
                'market' => $o[2],
                'status' => $o[3],
                'design' => $o[4],
                'clipCount' => $o[5],
                'requestedBy' => $o[6],
                'ageDays' => $o[7],
                'progress' => min(100, $stIdx * 18 + ($i % 4) * 4),
                'aspect' => $aspect,
                'dueDays' => $due[$i],
            ];
        }

        return $orders;
    }

    public static function copyRows(): array
    {
        return [
            ['slot' => 'hook_headline', 'key' => 'Hook headline', 'clip' => 'CLP-1046', 'scene' => 'Scene 1', 'variants' => ['EN' => 'Earn up to 9.96% APY', 'ES' => 'Gana hasta un 9,96% TAE', 'DE' => 'Bis zu 9,96% APY verdienen', 'EE' => 'Teeni kuni 9,96% APY', 'FR' => "Gagnez jusqu'à 9,96% APY"], 'status' => 'approved'],
            ['slot' => 'sub_line', 'key' => 'Sub line', 'clip' => 'CLP-1044', 'scene' => 'Scene 1', 'variants' => ['EN' => 'Your money, working harder', 'ES' => 'Tu dinero, rindiendo más', 'DE' => 'Dein Geld, das mehr leistet', 'EE' => 'Sinu raha töötab rohkem', 'FR' => 'Votre argent, plus rentable'], 'status' => 'approved'],
            ['slot' => 'proof_stat', 'key' => 'Proof stat', 'clip' => 'CLP-1058', 'scene' => 'Scene 2', 'variants' => ['EN' => 'Withdraw in 1 day', 'ES' => 'Retira en 1 día', 'DE' => 'Auszahlung in 1 Tag', 'EE' => 'Väljamakse 1 päevaga', 'FR' => 'Retrait en 1 jour'], 'status' => 'review'],
            ['slot' => 'trust_line', 'key' => 'Trust line', 'clip' => 'CLP-1048', 'scene' => 'Scene 2', 'variants' => ['EN' => 'Your data is protected', 'ES' => 'Tus datos están protegidos', 'DE' => 'Deine Daten sind geschützt', 'EE' => 'Sinu andmed on kaitstud', 'FR' => 'Vos données sont protégées'], 'status' => 'approved'],
            ['slot' => 'cta_button', 'key' => 'CTA button', 'clip' => 'CLP-1051', 'scene' => 'Scene 3', 'variants' => ['EN' => 'Get started', 'ES' => 'Empieza ahora', 'DE' => 'Loslegen', 'EE' => 'Alusta', 'FR' => 'Commencer'], 'status' => 'approved'],
            ['slot' => 'cta_caption', 'key' => 'CTA caption', 'clip' => 'CLP-1051', 'scene' => 'Scene 3', 'variants' => ['EN' => 'Open your Vault today', 'ES' => 'Abre tu Vault hoy', 'DE' => 'Öffne heute dein Vault', 'EE' => 'Ava oma Vault täna', 'FR' => "Ouvrez votre Vault aujourd'hui"], 'status' => 'missing'],
            ['slot' => 'legal_disclaimer', 'key' => 'Legal disclaimer', 'clip' => '—', 'scene' => 'Outro', 'variants' => ['EN' => 'Capital at risk. T&Cs apply.', 'ES' => 'Capital en riesgo. Aplican T&C.', 'DE' => 'Kapitalrisiko. AGB gelten.', 'EE' => 'Kapital on riskis. Kehtivad tingimused.', 'FR' => 'Capital à risque. CGU applicables.'], 'status' => 'review'],
        ];
    }

    public static function stats(): array
    {
        return [
            ['label' => 'Clips in library', 'value' => '248', 'delta' => '+12', 'good' => true, 'spark' => [12, 14, 13, 18, 20, 22, 26]],
            ['label' => 'Open orders', 'value' => '17', 'delta' => '+3', 'good' => true, 'spark' => [8, 9, 11, 10, 13, 15, 17]],
            ['label' => 'Rendered this week', 'value' => '92', 'delta' => '+28', 'good' => true, 'spark' => [40, 52, 48, 61, 70, 80, 92]],
            ['label' => 'Avg. turnaround', 'value' => '1.4d', 'delta' => '−0.3d', 'good' => true, 'spark' => [22, 20, 19, 18, 16, 15, 14]],
        ];
    }

    public static function activity(): array
    {
        return [
            ['who' => 'Elena Ruiz', 'what' => 'submitted', 'target' => 'Q3 SmartSaver — APY push (ES)', 'when' => '12m ago', 'kind' => 'submit'],
            ['who' => 'Templater', 'what' => 'rendered 4 variants for', 'target' => 'Testimonials cutdown — DE', 'when' => '40m ago', 'kind' => 'render'],
            ['who' => 'Karl Tamm', 'what' => 'added 6 clips to', 'target' => 'Vault launch — Estonia reels', 'when' => '1h ago', 'kind' => 'clip'],
            ['who' => 'You', 'what' => 'approved copy for', 'target' => 'hook_headline · 5 locales', 'when' => '2h ago', 'kind' => 'copy'],
            ['who' => 'Amélie Roy', 'what' => 'created order', 'target' => 'Credit24 retarget — FR', 'when' => '3h ago', 'kind' => 'submit'],
        ];
    }
}

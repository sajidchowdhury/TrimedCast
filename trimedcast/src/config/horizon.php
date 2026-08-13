<?php

return [

    'waits' => [
        'redis:default' => 60,
    ],

    'trim' => [
        'recent' => 60 * 24,
        'pending' => 60 * 24 * 7,
        'failed' => 60 * 24 * 30,
    ],

    'silenced' => [],

    'environments' => [
        'production' => [
            'supply-forecast' => [
                'connection' => 'redis',
                'queue' => ['forecasts'],
                'processes' => 2,
                'balance' => 'auto',
                'balanceCooldown' => 1,
                'balanceMaxShift' => 1,
                'tries' => 3,
            ],
            'data-import' => [
                'connection' => 'redis',
                'queue' => ['imports'],
                'processes' => 1,
                'balance' => 'auto',
                'tries' => 3,
            ],
            'notifications' => [
                'connection' => 'redis',
                'queue' => ['notifications'],
                'processes' => 1,
                'balance' => 'auto',
                'tries' => 3,
            ],
            'default' => [
                'connection' => 'redis',
                'queue' => ['default'],
                'processes' => 2,
                'balance' => 'auto',
                'tries' => 3,
            ],
        ],

        'local' => [
            'supply-forecast' => [
                'connection' => 'redis',
                'queue' => ['forecasts'],
                'processes' => 1,
                'tries' => 3,
            ],
            'data-import' => [
                'connection' => 'redis',
                'queue' => ['imports'],
                'processes' => 1,
                'tries' => 3,
            ],
            'default' => [
                'connection' => 'redis',
                'queue' => ['default'],
                'processes' => 1,
                'tries' => 3,
            ],
        ],
    ],

];

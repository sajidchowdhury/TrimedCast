<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class DataImport extends Model
{
    use BelongsToTenant;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'tenant_id',
        'user_id',
        'filename',
        'original_filename',
        'file_path',
        'file_size_bytes',
        'mime_type',
        'import_type',
        'format',
        'status',
        'total_rows',
        'processed_rows',
        'successful_rows',
        'failed_rows',
        'skipped_rows',
        'duplicate_rows',
        'validation_errors',
        'column_mapping',
        'import_summary',
        'processing_time_ms',
        'started_at',
        'completed_at',
        'error_message',
        'metadata',
    ];

    protected $casts = [
        'started_at' => 'datetime',
        'completed_at' => 'datetime',
        'validation_errors' => 'array',
        'column_mapping' => 'array',
        'import_summary' => 'array',
        'metadata' => 'array',
    ];

    protected static function booted(): void
    {
        static::creating(function (DataImport $import) {
            if (empty($import->id)) {
                $import->id = (string) Str::uuid();
            }
        });
    }

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function isCompleted(): bool
    {
        return $this->status === 'completed';
    }

    public function isFailed(): bool
    {
        return $this->status === 'failed';
    }

    public function successRate(): float
    {
        if ($this->total_rows === 0) {
            return 0.0;
        }
        return round(($this->successful_rows / $this->total_rows) * 100, 2);
    }
}

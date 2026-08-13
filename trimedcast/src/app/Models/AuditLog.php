<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class AuditLog extends Model
{
    use BelongsToTenant;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'tenant_id',
        'user_id',
        'user_name',
        'action',
        'subject_type',
        'subject_id',
        'previous_value',
        'new_value',
        'changed_fields',
        'ip_address',
        'user_agent',
        'request_url',
        'request_method',
        'severity',
        'metadata',
    ];

    protected $casts = [
        'previous_value' => 'array',
        'new_value' => 'array',
        'changed_fields' => 'array',
        'metadata' => 'array',
    ];

    protected static function booted(): void
    {
        static::creating(function (AuditLog $log) {
            if (empty($log->id)) {
                $log->id = (string) Str::uuid();
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

    public function subject()
    {
        return $this->morphTo();
    }

    public function isCritical(): bool
    {
        return $this->severity === 'critical';
    }

    public function scopeRecent($query, int $days = 30)
    {
        return $query->where('created_at', '>=', now()->subDays($days));
    }

    public function scopeForSubject($query, string $subjectType, string $subjectId)
    {
        return $query->where('subject_type', $subjectType)
            ->where('subject_id', $subjectId);
    }
}

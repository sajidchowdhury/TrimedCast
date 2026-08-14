<?php

namespace App\Models;

use App\Traits\BelongsToTenant;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

class SopCycle extends Model
{
    use BelongsToTenant;

    protected $keyType = 'string';
    public $incrementing = false;

    protected $fillable = [
        'tenant_id',
        'name',
        'year',
        'cycle_type',
        'cycle_number',
        'stage',
        'data_gathering_start',
        'data_gathering_end',
        'demand_planning_start',
        'demand_planning_end',
        'supply_planning_start',
        'supply_planning_end',
        'executive_review_start',
        'executive_review_end',
        'status',
        'approved_by',
        'approved_at',
        'demand_consensus',
        'supply_consensus',
        'variance_analysis',
        'notes',
    ];

    protected $casts = [
        'data_gathering_start' => 'datetime',
        'data_gathering_end' => 'datetime',
        'demand_planning_start' => 'datetime',
        'demand_planning_end' => 'datetime',
        'supply_planning_start' => 'datetime',
        'supply_planning_end' => 'datetime',
        'executive_review_start' => 'datetime',
        'executive_review_end' => 'datetime',
        'approved_at' => 'datetime',
        'demand_consensus' => 'array',
        'supply_consensus' => 'array',
        'variance_analysis' => 'array',
    ];

    protected static function booted(): void
    {
        static::creating(function (SopCycle $cycle) {
            if (empty($cycle->id)) {
                $cycle->id = (string) Str::uuid();
            }
        });
    }

    public function tenant()
    {
        return $this->belongsTo(Tenant::class);
    }

    public function approver()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function recommendedOrders()
    {
        return $this->hasMany(RecommendedOrder::class, 'sop_cycle_id');
    }

    public function isApproved(): bool
    {
        return $this->status === 'approved';
    }

    public function currentStageLabel(): string
    {
        return match ($this->stage) {
            'data_gathering' => 'Data Gathering',
            'demand_planning' => 'Demand Planning',
            'supply_planning' => 'Supply Planning',
            'executive_review' => 'Executive Review',
            default => ucfirst(str_replace('_', ' ', $this->stage)),
        };
    }
}

"""
Indicator Registry with Versioning

Manages indicator registration, versioning, and parameter validation.
Supports versioned indicators (e.g., RSI@1.2.0) for reproducible strategies.
"""

from typing import Dict, List, Optional, Any, Type, Tuple
import re
import logging
from dataclasses import dataclass, field
from packaging import version
from .base_indicator import BaseIndicator, IndicatorSpec

logger = logging.getLogger(__name__)


@dataclass
class IndicatorRegistration:
    """Indicator registration record"""
    indicator_id: str  # e.g., "EMA", "RSI"
    version: str  # e.g., "1.2.0"
    indicator_class: Type[BaseIndicator]
    spec: IndicatorSpec
    default_params: Dict[str, Any]
    registered_at: float
    description: str = ""
    deprecated: bool = False
    
    @property
    def full_id(self) -> str:
        """Get full versioned ID (e.g., 'RSI@1.2.0')"""
        return f"{self.indicator_id}@{self.version}"
    
    @property
    def version_tuple(self) -> Tuple[int, ...]:
        """Get version as tuple for comparison"""
        return version.parse(self.version).release


class IndicatorRegistry:
    """
    Registry for managing indicator types with versioning
    
    Features:
    - Versioned indicators for reproducible strategies
    - Parameter validation and defaults
    - Backward compatibility support
    - Registration metadata
    """
    
    def __init__(self):
        # Main registry: {indicator_id: {version: registration}}
        self.registry: Dict[str, Dict[str, IndicatorRegistration]] = {}
        
        # Quick lookup: {full_id: registration}
        self.full_id_lookup: Dict[str, IndicatorRegistration] = {}
        
        # Default versions: {indicator_id: version}
        self.default_versions: Dict[str, str] = {}
        
        # Parameter schemas for validation
        self.param_schemas: Dict[str, Dict[str, Any]] = {}
    
    def register(
        self,
        indicator_id: str,
        indicator_class: Type[BaseIndicator],
        version: str = "1.0.0",
        default_params: Dict[str, Any] = None,
        description: str = "",
        set_as_default: bool = True
    ) -> str:
        """
        Register an indicator with version
        
        Args:
            indicator_id: Base indicator ID (e.g., "EMA", "RSI")
            indicator_class: Indicator implementation class
            version: Semantic version (e.g., "1.2.0")
            default_params: Default parameter values
            description: Human-readable description
            set_as_default: Set this version as default for the indicator
            
        Returns:
            Full versioned ID (e.g., "EMA@1.2.0")
        """
        # Validate version format
        try:
            version.parse(version)
        except Exception as e:
            raise ValueError(f"Invalid version format '{version}': {e}")
        
        # Create temporary instance to get spec
        temp_instance = indicator_class(**(default_params or {}))
        spec = temp_instance.get_spec()
        
        # Create registration
        registration = IndicatorRegistration(
            indicator_id=indicator_id,
            version=version,
            indicator_class=indicator_class,
            spec=spec,
            default_params=default_params or {},
            registered_at=time.time(),
            description=description
        )
        
        # Store in registry
        if indicator_id not in self.registry:
            self.registry[indicator_id] = {}
        
        self.registry[indicator_id][version] = registration
        self.full_id_lookup[registration.full_id] = registration
        
        # Set as default version if requested or if it's the first version
        if set_as_default or indicator_id not in self.default_versions:
            self.default_versions[indicator_id] = version
        
        logger.info(f"Registered indicator: {registration.full_id}")
        return registration.full_id
    
    def parse_indicator_spec(self, spec: str) -> Tuple[str, Optional[str], Dict[str, Any]]:
        """
        Parse indicator specification string
        
        Formats supported:
        - "EMA" -> ("EMA", None, {})
        - "EMA@1.2.0" -> ("EMA", "1.2.0", {})
        - "EMA@20" -> ("EMA", None, {"period": 20})
        - "EMA@1.2.0@20" -> ("EMA", "1.2.0", {"period": 20})
        - "RSI@14,70,30" -> ("RSI", None, {"period": 14, "overbought": 70, "oversold": 30})
        
        Returns:
            (indicator_id, version, params)
        """
        parts = spec.split('@')
        indicator_id = parts[0]
        
        version_str = None
        params = {}
        
        if len(parts) == 1:
            # Just indicator name
            pass
        elif len(parts) == 2:
            # Could be version or params
            second_part = parts[1]
            if re.match(r'^\d+\.\d+\.\d+$', second_part):
                # It's a version
                version_str = second_part
            else:
                # It's parameters
                params = self._parse_params(indicator_id, second_part)
        elif len(parts) == 3:
            # Version and params
            version_str = parts[1]
            params = self._parse_params(indicator_id, parts[2])
        else:
            raise ValueError(f"Invalid indicator spec format: {spec}")
        
        return indicator_id, version_str, params
    
    def _parse_params(self, indicator_id: str, param_str: str) -> Dict[str, Any]:
        """Parse parameter string into dict"""
        params = {}
        
        # Get parameter schema for this indicator
        schema = self.get_param_schema(indicator_id)
        if not schema:
            # No schema - try to parse as comma-separated values
            values = param_str.split(',')
            if len(values) == 1:
                # Single parameter - assume it's 'period'
                try:
                    params['period'] = int(values[0])
                except ValueError:
                    params['period'] = float(values[0])
            else:
                # Multiple parameters - need schema to map them
                logger.warning(f"No parameter schema for {indicator_id}, cannot parse: {param_str}")
            return params
        
        # Parse using schema
        values = param_str.split(',')
        param_names = list(schema.keys())
        
        for i, value in enumerate(values):
            if i < len(param_names):
                param_name = param_names[i]
                param_type = schema[param_name].get('type', str)
                
                try:
                    if param_type == int:
                        params[param_name] = int(value)
                    elif param_type == float:
                        params[param_name] = float(value)
                    elif param_type == bool:
                        params[param_name] = value.lower() in ('true', '1', 'yes')
                    else:
                        params[param_name] = value
                except ValueError as e:
                    logger.error(f"Error parsing parameter {param_name}={value}: {e}")
        
        return params
    
    def get_indicator(self, spec: str) -> Optional[IndicatorRegistration]:
        """Get indicator registration by spec string"""
        indicator_id, version_str, params = self.parse_indicator_spec(spec)
        
        if indicator_id not in self.registry:
            return None
        
        # Use specified version or default
        target_version = version_str or self.default_versions.get(indicator_id)
        if not target_version:
            return None
        
        return self.registry[indicator_id].get(target_version)
    
    def create_indicator(self, spec: str, **override_params) -> Tuple[BaseIndicator, str]:
        """
        Create indicator instance from specification
        
        Args:
            spec: Indicator specification (e.g., "EMA@1.2.0@20")
            **override_params: Additional parameters to override
            
        Returns:
            (indicator_instance, full_versioned_id)
        """
        indicator_id, version_str, parsed_params = self.parse_indicator_spec(spec)
        
        registration = self.get_indicator(spec)
        if not registration:
            raise ValueError(f"Indicator not found: {spec}")
        
        # Merge parameters: default -> parsed -> override
        final_params = {}
        final_params.update(registration.default_params)
        final_params.update(parsed_params)
        final_params.update(override_params)
        
        # Validate parameters
        if not self._validate_params(registration, final_params):
            raise ValueError(f"Invalid parameters for {registration.full_id}: {final_params}")
        
        # Create instance
        instance = registration.indicator_class(**final_params)
        
        return instance, registration.full_id
    
    def _validate_params(self, registration: IndicatorRegistration, params: Dict[str, Any]) -> bool:
        """Validate parameters against indicator spec"""
        # Use the indicator's built-in validation
        return registration.spec.validate_params(params)
    
    def get_param_schema(self, indicator_id: str) -> Optional[Dict[str, Any]]:
        """Get parameter schema for indicator"""
        return self.param_schemas.get(indicator_id)
    
    def set_param_schema(self, indicator_id: str, schema: Dict[str, Any]):
        """Set parameter schema for indicator"""
        self.param_schemas[indicator_id] = schema
    
    def get_all_indicators(self) -> Dict[str, List[IndicatorRegistration]]:
        """Get all registered indicators grouped by ID"""
        result = {}
        for indicator_id, versions in self.registry.items():
            result[indicator_id] = list(versions.values())
        return result
    
    def get_versions(self, indicator_id: str) -> List[str]:
        """Get all versions for an indicator"""
        if indicator_id not in self.registry:
            return []
        return sorted(self.registry[indicator_id].keys(), key=lambda v: version.parse(v))
    
    def get_latest_version(self, indicator_id: str) -> Optional[str]:
        """Get latest version for an indicator"""
        versions = self.get_versions(indicator_id)
        return versions[-1] if versions else None
    
    def get_default_version(self, indicator_id: str) -> Optional[str]:
        """Get default version for an indicator"""
        return self.default_versions.get(indicator_id)
    
    def set_default_version(self, indicator_id: str, version_str: str):
        """Set default version for an indicator"""
        if indicator_id not in self.registry or version_str not in self.registry[indicator_id]:
            raise ValueError(f"Version {version_str} not found for {indicator_id}")
        
        self.default_versions[indicator_id] = version_str
        logger.info(f"Set default version for {indicator_id}: {version_str}")
    
    def deprecate_version(self, indicator_id: str, version_str: str):
        """Mark a version as deprecated"""
        if indicator_id in self.registry and version_str in self.registry[indicator_id]:
            self.registry[indicator_id][version_str].deprecated = True
            logger.info(f"Deprecated {indicator_id}@{version_str}")
    
    def get_registry_info(self) -> Dict[str, Any]:
        """Get registry information"""
        total_indicators = sum(len(versions) for versions in self.registry.values())
        
        return {
            'total_indicator_types': len(self.registry),
            'total_versions': total_indicators,
            'indicators': {
                indicator_id: {
                    'versions': list(versions.keys()),
                    'default_version': self.default_versions.get(indicator_id),
                    'latest_version': self.get_latest_version(indicator_id)
                }
                for indicator_id, versions in self.registry.items()
            }
        }


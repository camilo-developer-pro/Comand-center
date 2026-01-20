#!/bash/bash

echo "=========================================="
echo "Command Center ERP - Auth Setup Verification"
echo "=========================================="
echo ""

# Check dependencies
echo "📦 Checking dependencies..."

if npm list @supabase/auth-ui-react > /dev/null 2>&1; then
  echo "  ✅ @supabase/auth-ui-react installed"
else
  echo "  ❌ @supabase/auth-ui-react MISSING"
fi

if npm list @supabase/auth-ui-shared > /dev/null 2>&1; then
  echo "  ✅ @supabase/auth-ui-shared installed"
else
  echo "  ❌ @supabase/auth-ui-shared MISSING"
fi

if npm list sonner > /dev/null 2>&1; then
  echo "  ✅ sonner installed"
else
  echo "  ❌ sonner MISSING"
fi

if npm list zod > /dev/null 2>&1; then
  echo "  ✅ zod installed"
else
  echo "  ❌ zod MISSING"
fi

if npm list react-hook-form > /dev/null 2>&1; then
  echo "  ✅ react-hook-form installed"
else
  echo "  ❌ react-hook-form MISSING"
fi

echo ""

# Check environment
echo "🔐 Checking environment..."

if [ -f ".env.local" ]; then
  echo "  ✅ .env.local exists"
  
  if grep -q "NEXT_PUBLIC_SUPABASE_URL" .env.local; then
    echo "  ✅ NEXT_PUBLIC_SUPABASE_URL configured"
  else
    echo "  ⚠️  NEXT_PUBLIC_SUPABASE_URL not set"
  fi
  
  if grep -q "NEXT_PUBLIC_SUPABASE_ANON_KEY" .env.local; then
    echo "  ✅ NEXT_PUBLIC_SUPABASE_ANON_KEY configured"
  else
    echo "  ⚠️  NEXT_PUBLIC_SUPABASE_ANON_KEY not set"
  fi
else
  echo "  ❌ .env.local MISSING - copy from .env.local.example"
fi

echo ""
echo "=========================================="
echo "Auth Setup Verification Complete"
echo "=========================================="

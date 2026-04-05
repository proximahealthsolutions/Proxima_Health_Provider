"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthShell from "@/components/auth/AuthShell";
import type { AuthPageConfig } from "@/types";
import { fetchApi } from "@/lib/api";
import { useCountries, useStates, useCities } from "@maphorbs/location-picker/react";

const config: AuthPageConfig = {
  role: "provider",
  dashboardRoute: "/provider",
  icon: "🩺",
  tagline: "Provider Portal",
  features: [
    "Complete your provider profile",
    "Confirm contact details",
    "Submit for admin approval",
  ],
  accentColor: {
    glow: "bg-[var(--color-accent-soft)]",
    border: "border-[color:var(--color-primary-soft-border)]",
    badgeBg: "bg-[var(--color-primary-soft)]",
    badgeBorder: "border-[color:var(--color-primary-soft-border)]",
    badgeText: "text-[var(--color-primary)]",
    dot: "bg-[var(--color-accent)]",
    iconBg: "bg-[var(--color-primary-soft)]",
    iconText: "text-[var(--color-primary)]",
    checkBg: "bg-[var(--color-accent-soft)]",
    checkBorder: "border-[color:var(--color-accent-soft-border)]",
    checkText: "text-[var(--color-primary)]",
    button: "bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)]",
    buttonHover: "hover:bg-[var(--color-primary-hover)]",
    buttonText: "text-[var(--color-on-primary)]",
    inputFocus: "focus:border-[var(--color-primary)]",
    link: "text-[var(--color-primary-muted)]",
    linkHover: "hover:text-[var(--color-primary-hover)]",
  },
};

export default function ProviderCompleteProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    age: "",
    address: "",
    street: "",
    country: "",
    state: "",
    city: "",
    phone: "",
    dateOfBirth: "",
    profileImageUrl: "",
    providerRecordNumber: "",
  });
  const [countryCode, setCountryCode] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [cityId, setCityId] = useState("");
  const { countries, loading: countriesLoading } = useCountries();
  const { states, loading: statesLoading } = useStates(countryCode);
  const { cities, loading: citiesLoading } = useCities(countryCode, stateCode);

  useEffect(() => {
    async function load() {
      try {
        const resp = await fetchApi("/providers/me");
        setForm({
          firstName: resp.firstName ?? "",
          lastName: resp.lastName ?? "",
          age: resp.age?.toString() ?? "",
          address: resp.address ?? "",
          street: resp.street ?? "",
          country: resp.country ?? "",
          state: resp.state ?? "",
          city: resp.city ?? "",
          phone: resp.phone ?? "",
          dateOfBirth: resp.dateOfBirth ?? "",
          profileImageUrl: resp.profileImageUrl ?? "",
          providerRecordNumber: resp.providerRecordNumber ?? "",
        });
      } catch {}
    }
    load();
  }, []);

  useEffect(() => {
    if (!form.country || !countries.length || countryCode) return;
    const found = countries.find((c) => c.name === form.country);
    if (found) {
      setCountryCode(found.iso2);
    }
  }, [countries, countryCode, form.country]);

  useEffect(() => {
    if (!form.state || !states.length || stateCode || !countryCode) return;
    const found = states.find((s) => s.name === form.state);
    if (found) {
      setStateCode(found.state_code);
    }
  }, [countryCode, form.state, stateCode, states]);

  useEffect(() => {
    if (!form.city || !cities.length || cityId || !stateCode) return;
    const found = cities.find((c) => c.name === form.city);
    if (found) {
      setCityId(String(found.id));
    }
  }, [cities, cityId, form.city, stateCode]);

  function update(key: keyof typeof form) {
    return (event: React.ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: event.target.value }));
  }

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      await fetchApi("/providers/complete-profile", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          age: Number(form.age),
        }),
      });
      router.push("/under-review");
    } catch (err: any) {
      setError(err?.message || "Unable to complete profile.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <AuthShell config={config}>
      <form onSubmit={handleSubmit} className="space-y-4 w-full">
        <div className="mb-4">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--color-primary-soft)] border border-[var(--color-primary-soft-border)] mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-accent)] animate-pulse" />
            <span className="text-[11px] font-bold tracking-widest uppercase text-[var(--color-primary)]">
              Complete Profile
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[var(--color-text)] tracking-tight mb-1.5">
            Finish your provider profile
          </h1>
          <p className="text-[var(--color-text-muted)] text-sm">
            This information will be reviewed by the admin team.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <input
            value={form.firstName}
            onChange={update("firstName")}
            placeholder="First name"
            required
            className="w-full px-4 py-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-sm"
          />
          <input
            value={form.lastName}
            onChange={update("lastName")}
            placeholder="Last name"
            required
            className="w-full px-4 py-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-sm"
          />
        </div>
        <input
          value={form.age}
          onChange={update("age")}
          type="number"
          placeholder="Age"
          required
          className="w-full px-4 py-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-sm"
        />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <select
            value={countryCode}
            onChange={(e) => {
              const code = e.target.value;
              setCountryCode(code);
              setStateCode("");
              setCityId("");
              const country = countries.find((c) => c.iso2 === code)?.name ?? "";
              setForm((prev) => ({ ...prev, country, state: "", city: "" }));
            }}
            required
            className="w-full px-4 py-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-sm"
          >
            <option value="">{countriesLoading ? "Loading countries..." : "Select country"}</option>
            {countries.map((country) => (
              <option key={country.iso2} value={country.iso2}>
                {country.emoji} {country.name}
              </option>
            ))}
          </select>
          <select
            value={stateCode}
            onChange={(e) => {
              const code = e.target.value;
              setStateCode(code);
              setCityId("");
              const stateName = states.find((s) => s.state_code === code)?.name ?? "";
              setForm((prev) => ({ ...prev, state: stateName, city: "" }));
            }}
            required
            disabled={!countryCode || statesLoading}
            className="w-full px-4 py-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-sm disabled:opacity-60"
          >
            <option value="">
              {!countryCode ? "Select country first" : statesLoading ? "Loading states..." : "Select state"}
            </option>
            {states.map((state) => (
              <option key={state.state_code} value={state.state_code}>
                {state.name}
              </option>
            ))}
          </select>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <select
            value={cityId}
            onChange={(e) => {
              const id = e.target.value;
              setCityId(id);
              const cityName = cities.find((c) => String(c.id) === id)?.name ?? "";
              setForm((prev) => ({ ...prev, city: cityName }));
            }}
            required
            disabled={!stateCode || citiesLoading}
            className="w-full px-4 py-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-sm disabled:opacity-60"
          >
            <option value="">
              {!stateCode ? "Select state first" : citiesLoading ? "Loading cities..." : "Select city"}
            </option>
            {cities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </select>
          <input
            value={form.address}
            onChange={update("address")}
            placeholder="Address"
            required
            className="w-full px-4 py-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-sm"
          />
        </div>
        <input
          value={form.street}
          onChange={update("street")}
          placeholder="Street"
          required
          className="w-full px-4 py-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-sm"
        />
        <input
          value={form.phone}
          onChange={update("phone")}
          placeholder="Phone (optional)"
          className="w-full px-4 py-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-sm"
        />
        <input
          value={form.dateOfBirth}
          onChange={update("dateOfBirth")}
          placeholder="Date of birth (optional)"
          className="w-full px-4 py-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-sm"
        />
        <input
          value={form.profileImageUrl}
          onChange={update("profileImageUrl")}
          placeholder="Profile image URL (optional)"
          className="w-full px-4 py-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-sm"
        />
        <input
          value={form.providerRecordNumber}
          onChange={update("providerRecordNumber")}
          placeholder="Provider record number"
          required
          className="w-full px-4 py-3 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] text-sm"
        />

        {error && (
          <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20">
            <p className="text-red-400 text-[13px]">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3.5 rounded-xl text-sm font-bold tracking-wide transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-[var(--color-on-primary)]"
        >
          {loading ? "Submitting..." : "Submit for approval"}
        </button>
      </form>
    </AuthShell>
  );
}

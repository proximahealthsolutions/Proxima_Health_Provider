"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Card, { CardHeader } from "@/components/shared/Card";
import Button from "@/components/shared/Button";
import { fetchApi } from "@/lib/api";
import { useCountries, useStates, useCities } from "@maphorbs/location-picker/react";
import Avatar from "@/components/shared/Avatar";

type ProviderProfile = {
  id?: string;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  gender?: string | null;
  address?: string | null;
  street?: string | null;
  state?: string | null;
  city?: string | null;
  country?: string | null;
  dateOfBirth?: string | null;
  profileImageUrl?: string | null;
  providerRecordNumber?: string | null;
  profileCompleted?: boolean | null;
  emailVerified?: boolean | null;
};

export default function SettingsPage() {
  const [profile, setProfile] = useState<ProviderProfile | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [countryCode, setCountryCode] = useState("");
  const [stateCode, setStateCode] = useState("");
  const [cityId, setCityId] = useState("");
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const { countries, loading: countriesLoading } = useCountries();
  const { states, loading: statesLoading } = useStates(countryCode);
  const { cities, loading: citiesLoading } = useCities(countryCode, stateCode);

  useEffect(() => {
    fetchApi("/providers/me")
      .then((data) => setProfile(data || null))
      .catch(() => setProfile(null));
  }, []);

  useEffect(() => {
    if (!profile || !countries.length || countryCode) return;
    const found = countries.find((c) => c.name === profile.country);
    if (found) {
      setCountryCode(found.iso2);
    }
  }, [countries, countryCode, profile]);

  useEffect(() => {
    if (!profile || !states.length || stateCode || !countryCode) return;
    const found = states.find((s) => s.name === profile.state);
    if (found) {
      setStateCode(found.state_code);
    }
  }, [countryCode, profile, stateCode, states]);

  useEffect(() => {
    if (!profile || !cities.length || cityId || !stateCode) return;
    const found = cities.find((c) => c.name === profile.city);
    if (found) {
      setCityId(String(found.id));
    }
  }, [cities, cityId, profile, stateCode]);

  const displayName = useMemo(() => {
    if (!profile) return "Provider Profile";
    const name = `${profile.firstName ?? ""} ${profile.lastName ?? ""}`.trim();
    return name || "Provider Profile";
  }, [profile]);

  function setField<K extends keyof ProviderProfile>(key: K, value: ProviderProfile[K]) {
    if (!profile) return;
    setProfile({ ...profile, [key]: value });
  }

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    const payload = {
      firstName: profile.firstName ?? "",
      lastName: profile.lastName ?? "",
      phone: profile.phone ?? "",
      gender: profile.gender ?? "",
      address: profile.address ?? "",
      street: profile.street ?? "",
      state: profile.state ?? "",
      city: profile.city ?? "",
      country: profile.country ?? "",
      dateOfBirth: profile.dateOfBirth ?? "",
      profileImageUrl: profile.profileImageUrl ?? "",
    };
    try {
      const updated = await fetchApi("/providers/me", {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      setProfile(updated);
      setMessage("Profile updated.");
    } catch {
      setMessage("Unable to update profile.");
    } finally {
      setSaving(false);
      window.setTimeout(() => setMessage(""), 2200);
    }
  }

  async function handleProfileImageChange(file?: File | null) {
    if (!file) return;
    setUploadingImage(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const updated = await fetchApi("/providers/me/profile-image", {
        method: "POST",
        body,
      });
      setProfile(updated);
      setMessage("Profile image updated.");
    } catch {
      setMessage("Unable to upload profile image.");
    } finally {
      setUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      window.setTimeout(() => setMessage(""), 2200);
    }
  }

  if (!profile) {
    return (
      <div className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] p-6 text-sm text-[var(--color-text-muted)]">
        Loading profile...
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="rounded-2xl p-6 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-hover)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-[var(--color-on-primary)]">Profile</h2>
          <p className="text-[var(--color-primary-contrast-soft)] text-sm mt-1">
            Keep your provider details accurate for patients and the care team.
          </p>
        </div>
        <Button
          onClick={handleSave}
          disabled={saving}
          className="bg-[var(--color-surface)] text-[var(--color-primary)] hover:bg-[var(--color-primary-soft)]"
        >
          {saving ? "Saving..." : "Save Profile"}
        </Button>
      </div>

      <div className="rounded-[28px] border border-[var(--color-border)] bg-[var(--color-surface)] p-4 sm:p-5 shadow-[0_14px_30px_rgba(15,23,42,0.06)]">
        <div className="flex flex-col items-center gap-4 text-center sm:flex-row sm:text-left">
          <Avatar
            initials={displayName.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase() || "DR"}
            imageUrl={profile.profileImageUrl ?? undefined}
            color="purple"
            size="xl"
            rounded
            className="ring-4 ring-white shadow-lg"
          />
          <div className="flex-1">
            <p className="text-sm font-semibold text-[var(--color-text)]">Profile photo</p>
            <p className="mt-1 text-xs text-[var(--color-text-muted)]">
              Use a real image picker here instead of pasting a URL. The card is tuned for mobile and desktop.
            </p>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingImage}
                className="w-full sm:w-auto bg-[var(--color-primary)] text-[var(--color-on-primary)] hover:bg-[var(--color-primary-hover)]"
              >
                {uploadingImage ? "Uploading..." : profile.profileImageUrl ? "Change Photo" : "Choose Photo"}
              </Button>
              {profile.profileImageUrl && (
                <Button
                  variant="outline"
                  className="w-full sm:w-auto"
                  onClick={() => setField("profileImageUrl", "")}
                >
                  Remove
                </Button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => handleProfileImageChange(e.target.files?.[0] ?? null)}
            />
          </div>
        </div>
      </div>

      {message && (
        <div className="px-4 py-3 rounded-xl border border-[color:var(--color-primary-soft-border)] bg-[var(--color-primary-soft)] text-[var(--color-primary)] text-sm font-medium">
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <Card>
          <CardHeader title="Overview" subtitle="Current account snapshot" />
          <div className="px-5 pb-5 space-y-3">
            <div>
              <div className="text-sm font-semibold text-[var(--color-text)]">{displayName}</div>
              <div className="text-xs text-[var(--color-text-muted)]">{profile.email ?? "No email on file"}</div>
            </div>
            <div className="grid grid-cols-1 gap-2 text-xs text-[var(--color-text-muted)]">
              <div className="flex justify-between">
                <span>Email Verified</span>
                <span className="text-[var(--color-text)]">{profile.emailVerified ? "Yes" : "No"}</span>
              </div>
              <div className="flex justify-between">
                <span>Profile Completed</span>
                <span className="text-[var(--color-text)]">{profile.profileCompleted ? "Yes" : "No"}</span>
              </div>
              <div className="flex justify-between">
                <span>Record Number</span>
                <span className="text-[var(--color-text)]">{profile.providerRecordNumber ?? "—"}</span>
              </div>
              <div className="flex justify-between">
                <span>Gender</span>
                <span className="text-[var(--color-text)]">{profile.gender ?? "—"}</span>
              </div>
            </div>
          </div>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader title="Personal Details" subtitle="Basic details visible across the portal" />
          <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              value={profile.firstName ?? ""}
              onChange={(e) => setField("firstName", e.target.value)}
              placeholder="First name"
              className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text)] bg-[var(--color-surface)] focus:outline-none focus:border-[var(--color-primary)]"
            />
            <input
              value={profile.lastName ?? ""}
              onChange={(e) => setField("lastName", e.target.value)}
              placeholder="Last name"
              className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text)] bg-[var(--color-surface)] focus:outline-none focus:border-[var(--color-primary)]"
            />
            <input
              value={profile.email ?? ""}
              disabled
              placeholder="Email"
              className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text-muted)] bg-[var(--color-surface-soft)] sm:col-span-2"
            />
            <input
              value={profile.phone ?? ""}
              onChange={(e) => setField("phone", e.target.value)}
              placeholder="Phone"
              className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text)] bg-[var(--color-surface)] focus:outline-none focus:border-[var(--color-primary)]"
            />
            <select
              value={profile.gender ?? ""}
              onChange={(e) => setField("gender", e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text)] bg-[var(--color-surface)] focus:outline-none focus:border-[var(--color-primary)]"
            >
              <option value="">Gender</option>
              <option value="M">Male</option>
              <option value="F">Female</option>
              <option value="Other">Other</option>
            </select>
            <input
              value={profile.dateOfBirth ?? ""}
              onChange={(e) => setField("dateOfBirth", e.target.value)}
              placeholder="Date of birth"
              className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text)] bg-[var(--color-surface)] focus:outline-none focus:border-[var(--color-primary)]"
            />
          </div>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader title="Address & Contact" subtitle="Location and reachability details" />
          <div className="px-5 pb-5 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              value={profile.address ?? ""}
              onChange={(e) => setField("address", e.target.value)}
              placeholder="Address"
              className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text)] bg-[var(--color-surface)] sm:col-span-2 focus:outline-none focus:border-[var(--color-primary)]"
            />
            <input
              value={profile.street ?? ""}
              onChange={(e) => setField("street", e.target.value)}
              placeholder="Street"
              className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text)] bg-[var(--color-surface)] focus:outline-none focus:border-[var(--color-primary)]"
            />
            <select
              value={countryCode}
              onChange={(e) => {
                const code = e.target.value;
                setCountryCode(code);
                setStateCode("");
                setCityId("");
                const country = countries.find((c) => c.iso2 === code)?.name ?? "";
                setField("country", country);
                setField("state", "");
                setField("city", "");
              }}
              className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text)] bg-[var(--color-surface)] focus:outline-none focus:border-[var(--color-primary)]"
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
                setField("state", stateName);
                setField("city", "");
              }}
              disabled={!countryCode || statesLoading}
              className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text)] bg-[var(--color-surface)] focus:outline-none focus:border-[var(--color-primary)] disabled:opacity-60"
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
            <select
              value={cityId}
              onChange={(e) => {
                const id = e.target.value;
                setCityId(id);
                const cityName = cities.find((c) => String(c.id) === id)?.name ?? "";
                setField("city", cityName);
              }}
              disabled={!stateCode || citiesLoading}
              className="w-full px-3 py-2.5 rounded-xl border border-[var(--color-border)] text-sm text-[var(--color-text)] bg-[var(--color-surface)] focus:outline-none focus:border-[var(--color-primary)] disabled:opacity-60"
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
          </div>
        </Card>
      </div>
    </div>
  );
}


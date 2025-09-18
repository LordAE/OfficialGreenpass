// src/pages/Checkout.jsx
import React, { useEffect, useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, AlertTriangle, Package as PackageIcon, CheckCircle, CreditCard } from "lucide-react";

import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

// Firebase
import { db, auth } from "@/firebase";
import {
  doc,
  getDoc,
  getDocs,
  collection,
  query,
  where,
  limit,
  addDoc,
  serverTimestamp,
  updateDoc,
  increment,
} from "firebase/firestore";

import SharedPaymentGateway from "../components/payments/SharedPaymentGateway";

export default function Checkout() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pkg, setPkg] = useState(null);
  const [userDoc, setUserDoc] = useState(null);

  const navigate = useNavigate();

  const urlParams = new URLSearchParams(window.location.search);
  const packageType = urlParams.get("type");
  const packageId =
    urlParams.get("packageId") || urlParams.get("package") || urlParams.get("id");

  // ---------- helpers ----------
  const getUserDocRef = () => {
    const uid = auth.currentUser?.uid;
    if (!uid) return null;
    return doc(db, "users", uid);
  };

  const safePrice = (v) => Number(v || 0);

  const findByIdOrName = async (colName, idOrName) => {
    // First try getDoc by id
    const byIdRef = doc(db, colName, idOrName);
    const byIdSnap = await getDoc(byIdRef);
    if (byIdSnap.exists()) return { id: byIdSnap.id, ...byIdSnap.data() };

    // fallback: query by name
    const q = query(collection(db, colName), where("name", "==", idOrName), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const d = snap.docs[0];
      return { id: d.id, ...d.data() };
    }
    return null;
  };

  const loadPackage = async (type, id) => {
    switch (type) {
      case "visa": {
        const p = await findByIdOrName("visa_packages", id);
        return p
          ? {
              ...p,
              type: "visa",
              price_usd: p.price_usd ?? p.price ?? 0,
              name: p.name || "Unnamed Package",
              description: p.description || "No description available",
              features: p.features || p.key_benefits || [],
            }
          : null;
      }
      case "tutor": {
        const p = await findByIdOrName("tutor_packages", id);
        return p
          ? {
              ...p,
              type: "tutor",
              price_usd: p.price_usd ?? p.price ?? 0,
              name: p.name || "Unnamed Package",
              description: p.description || "No description available",
              features: p.features || p.key_benefits || [],
            }
          : null;
      }
      case "student_tutor": {
        const p = await findByIdOrName("student_tutor_packages", id);
        return p
          ? {
              ...p,
              type: "student_tutor",
              price_usd: p.price_usd ?? p.price ?? 0,
              name: p.name || "Unnamed Package",
              description: p.description || "No description available",
              features: p.features || p.key_benefits || [],
              num_sessions: p.num_sessions || 1,
            }
          : null;
      }
      case "tutoring_session": {
        // direct by id
        const sRef = doc(db, "tutoring_sessions", id);
        const sSnap = await getDoc(sRef);
        if (!sSnap.exists()) return null;
        const s = { id: sSnap.id, ...sSnap.data() };
        return {
          id: s.id,
          type: "tutoring_session",
          name: `Tutoring Session - ${s.subject || "Session"}`,
          description: `${s.duration || 60} minute session`,
          price_usd: s.price ?? s.price_usd ?? 0,
          features: [`Subject: ${s.subject || "-"}`, `Duration: ${s.duration || 60} minutes`],
        };
      }
      case "marketplace_order": {
        const orderRef = doc(db, "marketplace_orders", id);
        const orderSnap = await getDoc(orderRef);
        if (!orderSnap.exists()) return null;
        const order = { id: orderSnap.id, ...orderSnap.data() };

        let serviceName = "Service";
        let serviceDesc = "";
        if (order.service_id) {
          const svcRef = doc(db, "services", order.service_id);
          const svcSnap = await getDoc(svcRef);
          if (svcSnap.exists()) {
            const svc = svcSnap.data();
            serviceName = svc.name || serviceName;
            serviceDesc = svc.description || "";
          }
        }

        return {
          id: order.id,
          type: "marketplace_order",
          name: serviceName,
          description: serviceDesc,
          price_usd: order.amount_usd ?? order.amount ?? 0,
          features: [serviceName, order.category ? `Category: ${order.category}` : null].filter(
            Boolean
          ),
        };
      }
      default:
        throw new Error(
          `Invalid package type: ${type}. Expected: visa, tutor, student_tutor, tutoring_session, marketplace_order`
        );
    }
  };

  // ---------- load ----------
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);

        if (!packageType) {
          throw new Error(
            `Package type is missing from URL. Expected ?type=visa|tutor|student_tutor|tutoring_session|marketplace_order`
          );
        }
        if (!packageId) {
          throw new Error(`Package ID is missing from URL. Expected ?packageId=...`);
        }

        // user
        const userRef = getUserDocRef();
        if (!userRef) throw new Error("You must be signed in to checkout.");
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) throw new Error("User profile not found.");
        setUserDoc({ id: userSnap.id, ...userSnap.data() });

        // package
        const pkgLoaded = await loadPackage(packageType, packageId);
        if (!pkgLoaded) {
          throw new Error(
            `Package not found for type=${packageType}, id/name=${packageId}.`
          );
        }
        setPkg(pkgLoaded);
      } catch (e) {
        console.error("Checkout load error:", e);
        setError(e.message || "Failed to load package information.");
      } finally {
        setLoading(false);
      }
    })();
  }, [packageType, packageId]);

  // ---------- payment handlers ----------
  const handlePaymentSuccess = async (paymentData) => {
    try {
      setLoading(true);
      setError(null);

      const userRef = getUserDocRef();
      if (!userRef) throw new Error("No authenticated user.");

      // Record the payment (optional but recommended)
      await addDoc(collection(db, "payments"), {
        user_id: userRef.id,
        related_entity_type: `${pkg.type}_package_purchase`,
        related_entity_id: pkg.id,
        amount_usd: safePrice(pkg.price_usd),
        status: "successful",
        provider: paymentData?.provider || "PayPal",
        transaction_id: paymentData?.transactionId || paymentData?.id || null,
        created_date: serverTimestamp(),
        meta: {
          description: `${pkg.name} - ${pkg.type} package`,
        },
      });

      // Update user and create case if needed
      const u = userDoc || {};
      const updates = {};

      switch (pkg.type) {
        case "visa": {
          const purchased = Array.isArray(u.purchased_packages) ? u.purchased_packages : [];
          updates.purchased_packages = [...purchased, pkg.name];
          // Upgrade type if needed
          if (u.user_type !== "student") updates.user_type = "student";

          // Create a case
          await addDoc(collection(db, "cases"), {
            student_id: userRef.id,
            case_type: pkg.name,
            package_id: pkg.id,
            status: "Application Started",
            case_requirements: pkg.doc_requirements || [],
            case_upload_tips: pkg.upload_tips || [],
            checklist: (pkg.doc_requirements || []).map((r) => ({
              task: r.label || String(r),
              status: "pending",
            })),
            timeline: [
              {
                event: "Package purchased and case created",
                date: new Date().toISOString(),
                actor: "system",
              },
            ],
            created_date: serverTimestamp(),
          });
          break;
        }

        case "tutor": {
          const tPurchased = Array.isArray(u.purchased_tutor_packages)
            ? u.purchased_tutor_packages
            : [];
          updates.purchased_tutor_packages = [...tPurchased, pkg.name];
          // Set user as tutor if that’s your intended flow
          if (u.user_type !== "tutor") updates.user_type = "tutor";
          break;
        }

        case "student_tutor": {
          // add session credits
          const credits = Number(u.session_credits || 0);
          updates.session_credits = credits + Number(pkg.num_sessions || 1);
          break;
        }

        case "tutoring_session":
          // You could add a “history” entry here if desired
          break;

        case "marketplace_order":
          // No user field changes by default
          break;

        default:
          break;
      }

      if (Object.keys(updates).length) {
        await updateDoc(userRef, updates);
      }

      // Navigate to the right place
      switch (pkg.type) {
        case "visa":
          navigate(createPageUrl("VisaRequests"));
          break;
        case "tutor":
          navigate(createPageUrl("TutorAvailability"));
          break;
        case "student_tutor":
          navigate(createPageUrl("Tutors"));
          break;
        case "tutoring_session":
          navigate(createPageUrl("StudentDashboard"));
          break;
        case "marketplace_order":
          navigate(createPageUrl("Dashboard"));
          break;
        default:
          navigate(createPageUrl("Dashboard"));
      }
    } catch (e) {
      console.error("Post-payment update error:", e);
      setError(
        "Payment succeeded, but we couldn't update your account. Please contact support."
      );
      setLoading(false);
    }
  };

  const handlePaymentError = (err) => {
    console.error("Payment error:", err);
    setError(err?.message || "Payment failed. Please try again.");
  };

  // ---------- UI ----------
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Loading checkout...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Checkout Error</h2>
            <p className="text-gray-600 mb-4 text-sm">{error}</p>
            <div className="flex flex-col gap-2">
              <Button onClick={() => navigate(createPageUrl("Dashboard"))} variant="outline">
                Return to Dashboard
              </Button>
              <Button onClick={() => window.location.reload()} size="sm" variant="ghost">
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!pkg) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <PackageIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Package Not Found</h2>
            <p className="text-gray-600 mb-4">The requested package could not be found.</p>
            <Button onClick={() => navigate(createPageUrl("Dashboard"))} variant="outline">
              Return to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Your Purchase</h1>
          <p className="text-gray-600">Review your selection and complete payment</p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8">
          {/* Package Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PackageIcon className="w-5 h-5" />
                Package Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">{pkg.name}</h3>
                <p className="text-gray-600 mt-1">{pkg.description}</p>
              </div>

              {pkg.features?.length > 0 && (
                <div>
                  <h4 className="font-medium text-gray-900 mb-2">Included:</h4>
                  <ul className="space-y-1">
                    {pkg.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                        <CheckCircle className="w-4 h-4 text-green-500" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="border-t pt-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total:</span>
                  <span className="text-2xl font-bold text-green-600">
                    ${safePrice(pkg.price_usd)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="w-5 h-5" />
                Payment Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <SharedPaymentGateway
                entityType={`${pkg.type}_package_purchase`}
                entityId={pkg.id}
                amount={safePrice(pkg.price_usd)}
                description={`${pkg.name} - ${pkg.type} package`}
                onSuccess={handlePaymentSuccess}
                onError={handlePaymentError}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}


import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    ArrowLeft,
    Plus,
    Receipt,
    Scale,
    Users,
    LogOut,
    Trash2,
    CheckCircle,
    XCircle,
    AlertCircle,
    CreditCard
} from 'lucide-react';
import api from '../api/api';
import { useAuth } from '../context/AuthContext';

const GroupDetail = () => {
    const { groupId } = useParams();
    const navigate = useNavigate();
    const { user: authUser } = useAuth();

    // Support either common user ID property.
    const currentUserId = Number(authUser?.user_id ?? authUser?.id);

    const [expenses, setExpenses] = useState([]);
    const [balances, setBalances] = useState([]);
    const [settlements, setSettlements] = useState([]);
    const [repayments, setRepayments] = useState([]);
    const [members, setMembers] = useState([]);

    const [showExpenseForm, setShowExpenseForm] = useState(false);
    const [showRepaymentForm, setShowRepaymentForm] = useState(false);
    const [loading, setLoading] = useState(false);
    const [dataLoading, setDataLoading] = useState(true);

    const initialExpenseForm = {
        description: '',
        amount: '',
        category: 'General',
        payer_id: '',
        splits: []
    };

    const initialRepaymentForm = {
        receiver_id: '',
        amount: '',
        note: ''
    };

    const [expenseForm, setExpenseForm] = useState(initialExpenseForm);
    const [repaymentForm, setRepaymentForm] = useState(initialRepaymentForm);

    const fetchGroupData = useCallback(async () => {
        setDataLoading(true);

        try {
            const [
                expRes,
                balRes,
                memRes,
                repRes
            ] = await Promise.all([
                api.get(`/expenses/group/${groupId}`),
                api.get(`/balances/group/${groupId}`),
                api.get(`/groups/${groupId}/members`),
                api.get(`/settlements/group/${groupId}`)
            ]);

            setExpenses(expRes.data);
            setBalances(balRes.data);
            setMembers(memRes.data);
            setRepayments(repRes.data);
        } catch (err) {
            console.error('Error fetching group data:', err);

            if (err.response?.status === 403) {
                alert("You don't have permission to access this group.");
                navigate('/dashboard');
            } else {
                alert(
                    err.response?.data?.detail ||
                    'Failed to load group data.'
                );
            }
        } finally {
            setDataLoading(false);
        }
    }, [groupId, navigate]);

    useEffect(() => {
        fetchGroupData();
    }, [fetchGroupData]);

    const fetchSettlements = async () => {
        try {
            const response = await api.get(
                `/balances/group/${groupId}/settle`
            );

            setSettlements(response.data);
        } catch (err) {
            alert(
                err.response?.data?.detail ||
                'Failed to calculate settlements.'
            );
        }
    };

    const getUserName = (userId) => {
        const id = Number(userId);

        const balanceMember = balances.find(
            (member) => Number(member.user_id) === id
        );

        if (balanceMember) {
            return balanceMember.username;
        }

        const groupMember = members.find(
            (member) => Number(member.user_id) === id
        );

        return groupMember?.username || `User ${userId}`;
    };

    const resetExpenseForm = () => {
        setExpenseForm({
            ...initialExpenseForm,
            splits: []
        });
    };

    const resetRepaymentForm = () => {
        setRepaymentForm(initialRepaymentForm);
    };

    const handleAddExpense = async (e) => {
        e.preventDefault();

        const totalAmount = Number(expenseForm.amount);

        if (!Number.isFinite(totalAmount) || totalAmount <= 0) {
            alert('Please enter a valid expense amount greater than zero.');
            return;
        }

        if (!expenseForm.payer_id) {
            alert('Please select the person who paid.');
            return;
        }

        if (expenseForm.splits.length === 0) {
            alert('Please add at least one expense split.');
            return;
        }

        const splitUserIds = expenseForm.splits.map(
            (split) => Number(split.user_id)
        );

        if (splitUserIds.some((id) => !Number.isInteger(id) || id <= 0)) {
            alert('Please select a valid member for every split.');
            return;
        }

        if (new Set(splitUserIds).size !== splitUserIds.length) {
            alert('Each member can appear only once in the expense splits.');
            return;
        }

        const splitAmounts = expenseForm.splits.map(
            (split) => Number(split.amount)
        );

        if (
            splitAmounts.some(
                (amount) => !Number.isFinite(amount) || amount < 0
            )
        ) {
            alert('Please enter valid, non-negative split amounts.');
            return;
        }

        const splitTotal = splitAmounts.reduce(
            (total, amount) => total + Math.round(amount * 100),
            0
        );

        const expenseTotal = Math.round(totalAmount * 100);

        if (splitTotal !== expenseTotal) {
            alert('The total of all splits must equal the expense amount.');
            return;
        }

        const validMemberIds = new Set(
            members.map((member) => Number(member.user_id))
        );

        if (
            !validMemberIds.has(Number(expenseForm.payer_id)) ||
            splitUserIds.some((id) => !validMemberIds.has(id))
        ) {
            alert('The payer and split members must belong to this group.');
            return;
        }

        const payload = {
            ...expenseForm,
            group_id: Number(groupId),
            payer_id: Number(expenseForm.payer_id),
            amount: totalAmount,
            splits: expenseForm.splits.map((split) => ({
                user_id: Number(split.user_id),
                amount: Number(split.amount)
            }))
        };

        setLoading(true);

        try {
            await api.post('/expenses/', payload);

            alert('Expense added successfully!');
            setShowExpenseForm(false);
            resetExpenseForm();

            await fetchGroupData();
        } catch (err) {
            alert(
                err.response?.data?.detail ||
                'Error adding expense. Check the split amounts and try again.'
            );
        } finally {
            setLoading(false);
        }
    };

    const handleAddRepayment = async (e) => {
        e.preventDefault();

        const amount = Number(repaymentForm.amount);
        const receiverId = Number(repaymentForm.receiver_id);

        if (!Number.isFinite(amount) || amount <= 0) {
            alert('Please enter a valid repayment amount greater than zero.');
            return;
        }

        if (!Number.isInteger(receiverId) || receiverId <= 0) {
            alert('Please select a valid receiver.');
            return;
        }

        if (receiverId === currentUserId) {
            alert('You cannot select yourself as the receiver.');
            return;
        }

        setLoading(true);

        try {
            const payload = {
                ...repaymentForm,
                group_id: Number(groupId),
                receiver_id: receiverId,
                amount
            };

            await api.post('/settlements/', payload);

            alert('Repayment recorded successfully!');
            setShowRepaymentForm(false);
            resetRepaymentForm();

            await fetchGroupData();
        } catch (err) {
            alert(
                err.response?.data?.detail ||
                'Error creating repayment request.'
            );
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmRepayment = async (id) => {
        if (!window.confirm('Confirm that you received this repayment?')) {
            return;
        }

        try {
            await api.post(`/settlements/${id}/confirm`);

            alert('Repayment confirmed successfully!');
            await fetchGroupData();
        } catch (err) {
            alert(
                err.response?.data?.detail ||
                'Failed to confirm repayment.'
            );
        }
    };

    const handleDisputeRepayment = async (id) => {
        const reason = prompt('Please provide a reason for the dispute:');

        if (!reason || !reason.trim()) {
            return;
        }

        try {
            await api.post(`/settlements/${id}/dispute`, {
                reason: reason.trim()
            });

            alert('Repayment disputed.');
            await fetchGroupData();
        } catch (err) {
            alert(
                err.response?.data?.detail ||
                'Failed to dispute repayment.'
            );
        }
    };

    const handleCancelRepayment = async (id) => {
        if (!window.confirm('Cancel this repayment request?')) {
            return;
        }

        try {
            await api.delete(`/settlements/${id}/cancel`);

            alert('Repayment cancelled.');
            await fetchGroupData();
        } catch (err) {
            alert(
                err.response?.data?.detail ||
                'Failed to cancel repayment.'
            );
        }
    };

    const handleAddSplitRow = () => {
        setExpenseForm((prev) => ({
            ...prev,
            splits: [
                ...prev.splits,
                { user_id: '', amount: '' }
            ]
        }));
    };

    const handleRemoveSplitRow = (index) => {
        setExpenseForm((prev) => ({
            ...prev,
            splits: prev.splits.filter((_, i) => i !== index)
        }));
    };

    const handleSplitChange = (index, field, value) => {
        setExpenseForm((prev) => ({
            ...prev,
            splits: prev.splits.map((split, i) =>
                i === index
                    ? { ...split, [field]: value }
                    : split
            )
        }));
    };

    const handleLeaveGroup = async () => {
        if (!window.confirm('Are you sure you want to leave this group?')) {
            return;
        }

        try {
            await api.delete(`/groups/${groupId}/leave`);

            alert('Left group successfully!');
            navigate('/dashboard');
        } catch (err) {
            alert(
                err.response?.data?.detail ||
                'Failed to leave group.'
            );
        }
    };

    const handleDeleteGroup = async () => {
        if (!window.confirm('Are you sure you want to DELETE this group?')) {
            return;
        }

        try {
            await api.delete(`/groups/${groupId}`);

            alert('Group deleted successfully!');
            navigate('/dashboard');
        } catch (err) {
            alert(
                err.response?.data?.detail ||
                'Failed to delete group.'
            );
        }
    };

    const getStatusBadge = (status) => {
        const styles = {
            PENDING:
                'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
            CONFIRMED:
                'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
            DISPUTED:
                'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400'
        };

        return (
            <span
                className={`px-2 py-1 rounded-full text-xs font-bold ${
                    styles[status] ||
                    'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                }`}
            >
                {status}
            </span>
        );
    };

    const formatAmount = (amount) =>
        Number(amount || 0).toFixed(2);

    const formatDate = (date) => {
        if (!date) return '—';

        const parsedDate = new Date(date);

        return Number.isNaN(parsedDate.getTime())
            ? '—'
            : parsedDate.toLocaleDateString();
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
            <nav className="bg-white dark:bg-gray-800 shadow-sm p-4 flex justify-between items-center gap-3">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full"
                        aria-label="Back to dashboard"
                    >
                        <ArrowLeft size={20} className="dark:text-white" />
                    </button>

                    <h1 className="text-xl font-bold dark:text-white">
                        Group Management
                    </h1>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={handleDeleteGroup}
                        className="flex items-center gap-2 text-gray-500 hover:text-red-600 hover:bg-red-50 dark:text-gray-400 dark:hover:bg-red-900/20 px-3 py-2 rounded-lg text-sm font-medium"
                    >
                        <Trash2 size={18} />
                        <span className="hidden sm:inline">Delete Group</span>
                    </button>

                    <button
                        onClick={handleLeaveGroup}
                        className="flex items-center gap-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20 px-3 py-2 rounded-lg text-sm font-medium"
                    >
                        <LogOut size={18} />
                        <span className="hidden sm:inline">Leave Group</span>
                    </button>
                </div>
            </nav>

            <main className="max-w-6xl mx-auto p-4 sm:p-6">
                {dataLoading ? (
                    <p className="text-center py-12 text-gray-500 dark:text-gray-400">
                        Loading group data...
                    </p>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        <div className="lg:col-span-2 space-y-6">
                            {/* Expenses heading */}
                            <div className="flex justify-between items-center gap-3">
                                <h2 className="text-2xl font-bold flex items-center gap-2 dark:text-white">
                                    <Receipt className="text-blue-600 dark:text-blue-400" />
                                    Expenses
                                </h2>

                                <button
                                    onClick={() => setShowExpenseForm(true)}
                                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
                                >
                                    <Plus size={20} />
                                    Add Expense
                                </button>
                            </div>

                            {/* Add expense form */}
                            {showExpenseForm && (
                                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border dark:border-gray-700">
                                    <form onSubmit={handleAddExpense} className="space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                                                    Description
                                                </label>
                                                <input
                                                    type="text"
                                                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                                    value={expenseForm.description}
                                                    onChange={(e) =>
                                                        setExpenseForm((prev) => ({
                                                            ...prev,
                                                            description: e.target.value
                                                        }))
                                                    }
                                                    required
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                                                    Amount (₹)
                                                </label>
                                                <input
                                                    type="number"
                                                    min="0.01"
                                                    step="0.01"
                                                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                                    value={expenseForm.amount}
                                                    onChange={(e) =>
                                                        setExpenseForm((prev) => ({
                                                            ...prev,
                                                            amount: e.target.value
                                                        }))
                                                    }
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                                                Category
                                            </label>
                                            <select
                                                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                                value={expenseForm.category}
                                                onChange={(e) =>
                                                    setExpenseForm((prev) => ({
                                                        ...prev,
                                                        category: e.target.value
                                                    }))
                                                }
                                            >
                                                <option value="General">General</option>
                                                <option value="Food">Food</option>
                                                <option value="Travel">Travel</option>
                                                <option value="Rent">Rent</option>
                                                <option value="Shopping">Shopping</option>
                                                <option value="Utilities">Utilities</option>
                                                <option value="Other">Other</option>
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                                                Payer
                                            </label>
                                            <select
                                                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                                value={expenseForm.payer_id}
                                                onChange={(e) =>
                                                    setExpenseForm((prev) => ({
                                                        ...prev,
                                                        payer_id: e.target.value
                                                    }))
                                                }
                                                required
                                            >
                                                <option value="">Select Payer</option>
                                                {members.map((member) => (
                                                    <option
                                                        key={member.user_id}
                                                        value={member.user_id}
                                                    >
                                                        {getUserName(member.user_id)}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-2 dark:text-gray-300">
                                                Expense Splits (₹)
                                            </label>

                                            <div className="space-y-2">
                                                {expenseForm.splits.map((split, idx) => (
                                                    <div
                                                        key={idx}
                                                        className="flex gap-2 items-center"
                                                    >
                                                        <select
                                                            className="flex-1 min-w-0 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                                            value={split.user_id}
                                                            onChange={(e) =>
                                                                handleSplitChange(
                                                                    idx,
                                                                    'user_id',
                                                                    e.target.value
                                                                )
                                                            }
                                                            required
                                                        >
                                                            <option value="">Select User</option>
                                                            {members.map((member) => (
                                                                <option
                                                                    key={member.user_id}
                                                                    value={member.user_id}
                                                                >
                                                                    {getUserName(member.user_id)}
                                                                </option>
                                                            ))}
                                                        </select>

                                                        <input
                                                            type="number"
                                                            min="0"
                                                            step="0.01"
                                                            className="w-28 p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                                            placeholder="Amount"
                                                            value={split.amount}
                                                            onChange={(e) =>
                                                                handleSplitChange(
                                                                    idx,
                                                                    'amount',
                                                                    e.target.value
                                                                )
                                                            }
                                                            required
                                                        />

                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveSplitRow(idx)}
                                                            className="text-red-500 hover:text-red-700 p-2"
                                                            title="Remove split"
                                                            aria-label={`Remove split ${idx + 1}`}
                                                        >
                                                            <Trash2 size={18} />
                                                        </button>
                                                    </div>
                                                ))}

                                                <button
                                                    type="button"
                                                    onClick={handleAddSplitRow}
                                                    className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
                                                >
                                                    + Add Split Row
                                                </button>
                                            </div>
                                        </div>

                                        <div className="flex justify-end gap-3 mt-6">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowExpenseForm(false);
                                                    resetExpenseForm();
                                                }}
                                                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                                            >
                                                Cancel
                                            </button>

                                            <button
                                                type="submit"
                                                disabled={loading}
                                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                                            >
                                                {loading ? 'Saving...' : 'Save Expense'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            {/* Expenses table */}
                            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm">
                                        <tr>
                                            <th className="p-4 font-medium">Description</th>
                                            <th className="p-4 font-medium">Payer</th>
                                            <th className="p-4 font-medium">Amount</th>
                                            <th className="p-4 font-medium">Date</th>
                                        </tr>
                                    </thead>

                                    <tbody className="dark:text-gray-300">
                                        {expenses.map((expense) => (
                                            <tr
                                                key={expense.expense_id}
                                                className="border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                                            >
                                                <td className="p-4">
                                                    {expense.description}
                                                </td>
                                                <td className="p-4">
                                                    {getUserName(expense.payer_id)}
                                                </td>
                                                <td className="p-4 font-semibold">
                                                    ₹{formatAmount(expense.amount)}
                                                </td>
                                                <td className="p-4 text-sm text-gray-500 dark:text-gray-400">
                                                    {formatDate(expense.date)}
                                                </td>
                                            </tr>
                                        ))}

                                        {expenses.length === 0 && (
                                            <tr>
                                                <td
                                                    colSpan="4"
                                                    className="p-8 text-center text-gray-500 dark:text-gray-400"
                                                >
                                                    No expenses recorded yet.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>

                            {/* Repayments heading */}
                            <div className="flex justify-between items-center gap-3">
                                <h2 className="text-2xl font-bold flex items-center gap-2 dark:text-white">
                                    <CreditCard className="text-orange-600 dark:text-orange-400" />
                                    Repayments
                                </h2>

                                <button
                                    onClick={() => setShowRepaymentForm(true)}
                                    className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 flex items-center gap-2"
                                >
                                    <Plus size={20} />
                                    Record Payment
                                </button>
                            </div>

                            {/* Add repayment form */}
                            {showRepaymentForm && (
                                <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-md border dark:border-gray-700">
                                    <form onSubmit={handleAddRepayment} className="space-y-4">
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                                                    Receiver
                                                </label>

                                                <select
                                                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                                    value={repaymentForm.receiver_id}
                                                    onChange={(e) =>
                                                        setRepaymentForm((prev) => ({
                                                            ...prev,
                                                            receiver_id: e.target.value
                                                        }))
                                                    }
                                                    required
                                                >
                                                    <option value="">Select Receiver</option>

                                                    {members
                                                        .filter(
                                                            (member) =>
                                                                Number(member.user_id) !== currentUserId
                                                        )
                                                        .map((member) => (
                                                            <option
                                                                key={member.user_id}
                                                                value={member.user_id}
                                                            >
                                                                {getUserName(member.user_id)}
                                                            </option>
                                                        ))}
                                                </select>
                                            </div>

                                            <div>
                                                <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                                                    Amount (₹)
                                                </label>

                                                <input
                                                    type="number"
                                                    min="0.01"
                                                    step="0.01"
                                                    className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                                    value={repaymentForm.amount}
                                                    onChange={(e) =>
                                                        setRepaymentForm((prev) => ({
                                                            ...prev,
                                                            amount: e.target.value
                                                        }))
                                                    }
                                                    required
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-sm font-medium mb-1 dark:text-gray-300">
                                                Note
                                            </label>

                                            <input
                                                type="text"
                                                className="w-full p-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                                value={repaymentForm.note}
                                                onChange={(e) =>
                                                    setRepaymentForm((prev) => ({
                                                        ...prev,
                                                        note: e.target.value
                                                    }))
                                                }
                                                placeholder="Optional note"
                                            />
                                        </div>

                                        <div className="flex justify-end gap-3 mt-6">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setShowRepaymentForm(false);
                                                    resetRepaymentForm();
                                                }}
                                                className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                                            >
                                                Cancel
                                            </button>

                                            <button
                                                type="submit"
                                                disabled={loading}
                                                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                                            >
                                                {loading ? 'Processing...' : 'Send Repayment'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            )}

                            {/* Repayments table */}
                            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border dark:border-gray-700 overflow-x-auto">
                                <table className="w-full text-left">
                                    <thead className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-sm">
                                        <tr>
                                            <th className="p-4 font-medium">Payer → Receiver</th>
                                            <th className="p-4 font-medium">Amount</th>
                                            <th className="p-4 font-medium">Status</th>
                                            <th className="p-4 font-medium">Date</th>
                                            <th className="p-4 font-medium text-right">Actions</th>
                                        </tr>
                                    </thead>

                                    <tbody className="dark:text-gray-300">
                                        {repayments.map((repayment) => {
                                            const isReceiver =
                                                currentUserId === Number(repayment.receiver_id);

                                            const isPayer =
                                                currentUserId === Number(repayment.payer_id);

                                            return (
                                                <tr
                                                    key={repayment.settlement_id}
                                                    className="border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700"
                                                >
                                                    <td className="p-4">
                                                        <div className="font-medium">
                                                            {getUserName(repayment.payer_id)}
                                                            {' → '}
                                                            {getUserName(repayment.receiver_id)}
                                                        </div>

                                                        <div className="text-xs text-gray-500 dark:text-gray-400 italic">
                                                            {repayment.note}
                                                        </div>

                                                        {repayment.dispute_reason && (
                                                            <div className="text-xs text-red-500 flex items-center gap-1 mt-1">
                                                                <AlertCircle size={12} />
                                                                {repayment.dispute_reason}
                                                            </div>
                                                        )}
                                                    </td>

                                                    <td className="p-4 font-semibold">
                                                        ₹{formatAmount(repayment.amount)}
                                                    </td>

                                                    <td className="p-4">
                                                        {getStatusBadge(repayment.status)}
                                                    </td>

                                                    <td className="p-4 text-sm text-gray-500 dark:text-gray-400">
                                                        {formatDate(repayment.created_at)}
                                                    </td>

                                                    <td className="p-4 text-right whitespace-nowrap">
                                                        {repayment.status === 'PENDING' && (
                                                            <>
                                                                {isReceiver && (
                                                                    <>
                                                                        <button
                                                                            onClick={() =>
                                                                                handleConfirmRepayment(
                                                                                    repayment.settlement_id
                                                                                )
                                                                            }
                                                                            className="text-green-600 hover:text-green-700 p-1"
                                                                            title="Confirm repayment"
                                                                            aria-label="Confirm repayment"
                                                                        >
                                                                            <CheckCircle size={18} />
                                                                        </button>

                                                                        <button
                                                                            onClick={() =>
                                                                                handleDisputeRepayment(
                                                                                    repayment.settlement_id
                                                                                )
                                                                            }
                                                                            className="text-red-600 hover:text-red-700 p-1"
                                                                            title="Dispute repayment"
                                                                            aria-label="Dispute repayment"
                                                                        >
                                                                            <XCircle size={18} />
                                                                        </button>
                                                                    </>
                                                                )}

                                                                {isPayer && (
                                                                    <button
                                                                        onClick={() =>
                                                                            handleCancelRepayment(
                                                                                repayment.settlement_id
                                                                            )
                                                                        }
                                                                        className="text-gray-500 hover:text-red-600 p-1"
                                                                        title="Cancel repayment"
                                                                        aria-label="Cancel repayment"
                                                                    >
                                                                        <Trash2 size={18} />
                                                                    </button>
                                                                )}
                                                            </>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}

                                        {repayments.length === 0 && (
                                            <tr>
                                                <td
                                                    colSpan="5"
                                                    className="p-8 text-center text-gray-500 dark:text-gray-400"
                                                >
                                                    No repayments recorded yet.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Balances and debt settlement */}
                        <div className="space-y-6">
                            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border dark:border-gray-700">
                                <h2 className="text-xl font-bold mb-4 flex items-center gap-2 dark:text-white">
                                    <Scale className="text-green-600 dark:text-green-400" />
                                    Balances
                                </h2>

                                <div className="space-y-3">
                                    {balances.map((balance) => (
                                        <div
                                            key={balance.user_id}
                                            className="flex justify-between items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                                        >
                                            <span className="font-medium dark:text-gray-200">
                                                {balance.username}
                                            </span>

                                            <span
                                                className={`font-bold ${
                                                    Number(balance.balance) >= 0
                                                        ? 'text-green-600 dark:text-green-400'
                                                        : 'text-red-600 dark:text-red-400'
                                                }`}
                                            >
                                                {Number(balance.balance) >= 0
                                                    ? `+₹${formatAmount(balance.balance)}`
                                                    : `-₹${formatAmount(Math.abs(Number(balance.balance)))}`}
                                            </span>
                                        </div>
                                    ))}

                                    {balances.length === 0 && (
                                        <p className="text-gray-500 dark:text-gray-400 text-sm text-center">
                                            No balance data available.
                                        </p>
                                    )}
                                </div>
                            </div>

                            <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border dark:border-gray-700">
                                <h2 className="text-xl font-bold mb-4 flex items-center gap-2 dark:text-white">
                                    <Users className="text-purple-600 dark:text-purple-400" />
                                    Debt Settlement
                                </h2>

                                <div className="space-y-3">
                                    {settlements.map((settlement, index) => (
                                        <div
                                            key={index}
                                            className="p-3 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-900/30 rounded-lg text-sm"
                                        >
                                            <span className="font-medium text-purple-800 dark:text-purple-300">
                                                {getUserName(settlement.payer_id)}
                                            </span>

                                            <span className="mx-2 text-gray-500 dark:text-gray-400">
                                                pays
                                            </span>

                                            <span className="font-medium text-purple-800 dark:text-purple-300">
                                                {getUserName(settlement.receiver_id)}
                                            </span>

                                            <div className="text-right font-bold text-purple-700 dark:text-purple-400">
                                                ₹{formatAmount(settlement.amount)}
                                            </div>
                                        </div>
                                    ))}

                                    {settlements.length === 0 && (
                                        <p className="text-gray-500 dark:text-gray-400 text-sm text-center mb-4">
                                            Calculate optimized payments to clear all debts.
                                        </p>
                                    )}

                                    <button
                                        onClick={fetchSettlements}
                                        className="w-full py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium"
                                    >
                                        Calculate Settlements
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
};

export default GroupDetail;
